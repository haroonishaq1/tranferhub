const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const pool = require('../config/database');

const router = express.Router();

// Configure multer for disk storage with error handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      fs.ensureDirSync(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error('Upload directory creation failed:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const originalName = file.originalname;
      const fileExtension = path.extname(originalName);
      const sanitizedName = path.basename(originalName, fileExtension).replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${timestamp}-${randomString}-${sanitizedName}${fileExtension}`;
      cb(null, uniqueFilename);
    } catch (error) {
      console.error('Filename generation failed:', error);
      cb(error);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 * 1024, // 50GB default
    files: 10
  },
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept all files
  }
});

// Generate 6-digit code
function generateDownloadCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if code exists in database
async function isCodeUnique(code) {
  try {
    const result = await pool.query(
      'SELECT download_code FROM files WHERE download_code = $1',
      [code]
    );
    return result.rows.length === 0;
  } catch (error) {
    console.error('Code uniqueness check failed:', error);
    throw error;
  }
}

// Generate unique 6-digit code
async function generateUniqueCode() {
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateDownloadCode();
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique code after multiple attempts');
    }
  } while (!(await isCodeUnique(code)));

  return code;
}

// Health check for this route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Upload routes are healthy',
    timestamp: new Date().toISOString()
  });
});

// Single file upload
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Single file upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const downloadCode = await generateUniqueCode();
    const fileName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const fileType = req.file.mimetype || 'application/octet-stream';

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (parseInt(process.env.FILE_EXPIRY_HOURS) || 168));

    // Store in database
    await pool.query(
      `INSERT INTO files (download_code, file_names, file_paths, file_sizes, file_types, expires_at, upload_status, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        downloadCode,
        [fileName],
        [filePath],
        [fileSize],
        [fileType],
        expiryDate,
        'completed',
        req.ip,
        req.get('User-Agent')
      ]
    );

    console.log(`✅ Single file uploaded: ${fileName} with code: ${downloadCode}`);

    res.json({
      success: true,
      downloadCode: downloadCode,
      fileCount: 1,
      totalSize: fileSize,
      expiryDate: expiryDate.toISOString()
    });

  } catch (error) {
    console.error('❌ Single upload error:', error);
    
    // Cleanup file if database insertion failed
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
        console.log('🧹 Cleaned up file after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Multiple files upload
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    console.log('📤 Multiple files upload request received');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No files uploaded' 
      });
    }

    const downloadCode = await generateUniqueCode();
    const fileNames = req.files.map(file => file.originalname);
    const filePaths = req.files.map(file => file.path);
    const fileSizes = req.files.map(file => file.size);
    const fileTypes = req.files.map(file => file.mimetype || 'application/octet-stream');
    const totalSize = fileSizes.reduce((sum, size) => sum + size, 0);

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (parseInt(process.env.FILE_EXPIRY_HOURS) || 168));

    // Store in database
    await pool.query(
      `INSERT INTO files (download_code, file_names, file_paths, file_sizes, file_types, expires_at, upload_status, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        downloadCode,
        fileNames,
        filePaths,
        fileSizes,
        fileTypes,
        expiryDate,
        'completed',
        req.ip,
        req.get('User-Agent')
      ]
    );

    console.log(`✅ Multiple files uploaded: ${req.files.length} files with code: ${downloadCode}`);

    res.json({
      success: true,
      downloadCode: downloadCode,
      fileCount: req.files.length,
      totalSize: totalSize,
      files: fileNames,
      expiryDate: expiryDate.toISOString()
    });

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    
    // Cleanup files if database insertion failed
    if (req.files) {
      try {
        await Promise.all(req.files.map(file => fs.remove(file.path)));
        console.log('🧹 Cleaned up files after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup files:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// P2P GET handler - returns method not allowed error
router.get('/p2p', (req, res) => {
  res.status(405).json({
    success: false,
    error: 'Method not allowed',
    message: 'P2P transfer setup requires POST request with file metadata'
  });
});

// P2P upload endpoint (generates code for P2P transfers)
router.post('/p2p', async (req, res) => {
  try {
    console.log('🔗 P2P transfer request received');
    
    const { fileNames, fileSizes, fileTypes } = req.body;
    
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File metadata required'
      });
    }

    const downloadCode = await generateUniqueCode();
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);    
    
    // Save metadata to database (no actual files for P2P)
    await pool.query(`
      INSERT INTO files (
        download_code, 
        file_names, 
        file_paths, 
        file_sizes, 
        file_types,
        expires_at,
        upload_status,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      downloadCode,
      fileNames,
      [], // No file paths for P2P
      fileSizes || fileNames.map(() => 0),
      fileTypes || fileNames.map(() => 'application/octet-stream'),
      expiresAt,
      'p2p',
      req.ip,
      req.get('User-Agent')
    ]);

    console.log(`✅ P2P transfer code generated: ${downloadCode}`);

    res.json({
      success: true,
      downloadCode: downloadCode,
      expiryDate: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ P2P upload error:', error);
    res.status(500).json({
      success: false,
      error: 'P2P setup failed',
      message: error.message
    });
  }
});

// Fallback upload for existing P2P codes
router.post('/fallback/:code', upload.array('files', 10), async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log(`🔄 Fallback upload request for code: ${code}`);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No files uploaded' 
      });
    }

    // Check if the code exists and is a P2P transfer
    const existingRecord = await pool.query(
      'SELECT * FROM files WHERE download_code = $1 AND upload_status = $2',
      [code, 'p2p']
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'P2P transfer not found or already completed' 
      });
    }

    const filePaths = req.files.map(file => file.path);
    const fileSizes = req.files.map(file => file.size);
    const fileTypes = req.files.map(file => file.mimetype || 'application/octet-stream');

    // Update the existing record with actual file data
    await pool.query(
      `UPDATE files SET 
        file_paths = $1, 
        file_sizes = $2, 
        file_types = $3,
        upload_status = $4,
        upload_date = NOW()
      WHERE download_code = $5`,
      [filePaths, fileSizes, fileTypes, 'completed', code]
    );

    console.log(`✅ Fallback upload completed for code: ${code}`);

    res.json({
      success: true,
      downloadCode: code,
      fileCount: req.files.length
    });

  } catch (error) {
    console.error('❌ Fallback upload error:', error);
    
    // Cleanup files on error
    if (req.files) {
      try {
        await Promise.all(req.files.map(file => fs.remove(file.path)));
        console.log('🧹 Cleaned up files after fallback error');
      } catch (cleanupError) {
        console.error('Failed to cleanup files:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Fallback upload failed',
      message: error.message
    });
  }
});

// Get upload statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_uploads,
        SUM(array_length(file_names, 1)) as total_files,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_uploads
      FROM files
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get stats' 
    });
  }
});

module.exports = router;
