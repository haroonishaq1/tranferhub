const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const pool = require('../config/database');
const archiver = require('archiver');

const router = express.Router();

console.log('✅ LOCAL FILE DOWNLOAD ROUTES LOADED! READY FOR LOCAL FILE DOWNLOADS!');

// Get file information by code (for preview)
router.get('/info/:code', async (req, res) => {
  try {
    console.log('📋 Info route hit with code:', req.params.code);
    const { code } = req.params;
    
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      console.log('❌ Invalid code format:', code);
      return res.status(400).json({ 
        error: 'Invalid code format. Code must be 6 digits.'
      });
    }
    
    console.log('✅ Code validation passed, querying database...');

    const result = await pool.query(
      'SELECT * FROM files WHERE download_code = $1 AND expires_at > NOW()',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'File not found or has expired.'
      });
    }

    const fileRecord = result.rows[0];
    const totalSize = fileRecord.file_sizes.reduce((sum, size) => sum + parseInt(size), 0);

    res.json({
      files: fileRecord.file_names.map((name, index) => ({
        filename: name,
        size: fileRecord.file_sizes[index],
        uploadDate: fileRecord.upload_date
      })),
      totalFiles: fileRecord.file_names.length,
      totalSize,
      expiresAt: fileRecord.expires_at
    });

  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download files by code (MUST BE LAST - catch-all route)
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log(`🔍 Download route hit with code: ${code}`);
    
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      console.log('❌ Invalid code format:', code);
      return res.status(400).json({
        error: 'Invalid code format. Code must be 6 digits.'
      });
    }

    console.log('✅ Code validation passed, querying database...');
    
    const result = await pool.query(
      'SELECT * FROM files WHERE download_code = $1 AND expires_at > NOW()',
      [code]
    );

    console.log(`📊 Records found: ${result.rows.length}`);

    if (result.rows.length === 0) {
      console.log('❌ File not found or has expired');
      return res.status(404).json({ 
        error: 'File not found or has expired.'
      });
    }
    
    const fileRecord = result.rows[0];

    // Log download attempt
    await pool.query(
      'INSERT INTO download_logs (download_code, ip_address, user_agent) VALUES ($1, $2, $3)',
      [code, req.ip, req.get('User-Agent')]
    );

    if (fileRecord.file_names.length === 1) {
      // Single file download - serve local file
      const fileName = fileRecord.file_names[0];
      const filePath = fileRecord.file_paths[0];
      
      console.log(`📥 Single file download: ${fileName}`);
      console.log(`📁 File path: ${filePath}`);
      
      try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.error('❌ File not found on disk:', filePath);
          return res.status(404).json({ 
            error: 'File not found on server'
          });
        }

        // Set download headers
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Stream file to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        console.log(`✅ Single file download initiated: ${fileName}`);
        
      } catch (fileError) {
        console.error('❌ File download error:', fileError);
        res.status(500).json({ 
          error: 'Error downloading file',
          message: fileError.message 
        });
      }
    } else {
      // Multiple files - create ZIP archive from local files
      console.log('📦 Creating ZIP archive for multiple files:', fileRecord.file_names);
      
      try {
        // Set ZIP download headers
        const zipFileName = `files_${code}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Create ZIP archive
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });

        // Handle archive errors
        archive.on('error', (err) => {
          console.error('❌ Archive error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error creating ZIP archive' });
          }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Add local files to archive
        for (let i = 0; i < fileRecord.file_paths.length; i++) {
          const filePath = fileRecord.file_paths[i];
          const fileName = fileRecord.file_names[i];
          
          console.log(`📄 Adding file to ZIP: ${fileName}`);
          
          try {
            // Check if file exists
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: fileName });
            } else {
              console.error(`❌ File not found: ${filePath}`);
            }
            
          } catch (fileError) {
            console.error(`❌ Error adding file ${fileName} to ZIP:`, fileError);
          }
        }

        // Finalize the archive
        console.log('✅ Finalizing ZIP archive...');
        await archive.finalize();
        
        console.log('✅ ZIP download completed');
        
      } catch (zipError) {
        console.error('❌ ZIP creation error:', zipError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Error creating ZIP archive',
            message: zipError.message 
          });
        }
      }
    }

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error during download' });
    }
  }
});

// P2P transfer availability check
router.get('/p2p/check/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ 
        error: 'Invalid code format. Code must be 6 digits.',
        available: false
      });
    }

    // Check if this is a P2P transfer
    const result = await pool.query(
      'SELECT * FROM files WHERE download_code = $1 AND expires_at > NOW()',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Transfer not found or has expired.',
        available: false
      });
    }

    const fileRecord = result.rows[0];
    
    // Check if it's a P2P transfer (has p2p_pending status or empty file_paths)
    const isP2PTransfer = fileRecord.upload_status === 'p2p_pending' || 
                         (fileRecord.file_paths && fileRecord.file_paths.length === 0);

    if (!isP2PTransfer) {
      return res.json({
        available: false,
        message: 'This is not a P2P transfer'
      });
    }

    res.json({
      available: true,
      fileCount: fileRecord.file_names.length,
      fileNames: fileRecord.file_names,
      fileSizes: fileRecord.file_sizes,
      fileTypes: fileRecord.file_types,
      totalSize: fileRecord.file_sizes.reduce((sum, size) => sum + parseInt(size), 0),
      createdAt: fileRecord.upload_date,
      expiresAt: fileRecord.expires_at
    });

  } catch (error) {
    console.error('P2P check error:', error);
    res.status(500).json({ 
      error: 'Server error during P2P check',
      available: false
    });
  }
});

module.exports = router;
