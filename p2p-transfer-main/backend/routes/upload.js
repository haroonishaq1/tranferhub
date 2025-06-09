const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const pool = require('../config/database');

const router = express.Router();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const originalName = file.originalname;
    const fileExtension = path.extname(originalName);
    const sanitizedName = path.basename(originalName, fileExtension).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${randomString}-${sanitizedName}${fileExtension}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 * 1024, // 50GB default
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Generate 6-digit code
function generateDownloadCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if code exists in database with retry logic
async function isCodeUnique(code) {
  try {
    const result = await pool.query(
      'SELECT download_code FROM files WHERE download_code = $1',
      [code]
    );
    return result.rows.length === 0;
  } catch (error) {
    console.error('❌ Database error checking code uniqueness:', error.message);
    // If database is down, assume code is unique to avoid infinite loops
    // This is safer than throwing an error that would break upload
    return true;
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

// UPLOAD ROUTES FOR LOCAL STORAGE

// Single file upload
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const downloadCode = await generateUniqueCode();
    const fileName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const fileType = req.file.mimetype || 'application/octet-stream';

    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (parseInt(process.env.FILE_EXPIRY_HOURS) || 168));

    // Store in database with retry logic
    try {
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
    } catch (dbError) {
      console.error('❌ Database insertion failed:', dbError.message);
      
      // Clean up uploaded file if database insertion fails
      try {
        await fs.remove(filePath);
        console.log('🧹 Cleaned up file after database failure');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup file:', cleanupError.message);
      }
      
      // Return meaningful error
      return res.status(500).json({ 
        error: 'Database error - upload failed',
        message: 'File uploaded but could not be registered. Please try again.',
        code: 'DB_INSERT_FAILED'
      });
    }

    console.log('File uploaded locally:', fileName, 'with code:', downloadCode);

    // Use minimal response pattern for consistency and reliability
    const minimalResponse = {
      success: true,
      downloadCode: downloadCode,
      fileCount: 1,
      totalSize: fileSize
    };
    
    // Use a more resilient response method with explicit headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'close'); // Force connection close to ensure complete delivery
    
    // Ensure complete response with explicit end
    res.end(JSON.stringify(minimalResponse));

  } catch (error) {
    console.error('Upload error:', error);
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Multiple files upload
router.post('/multiple', async (req, res) => {
  console.log('Received upload request from', req.ip, 'with headers:', req.headers);
  
  // Create upload middleware with error handling
  const handleUpload = upload.array('files', 10);
  
  try {
    // Handle multer errors with a promise wrapper and timeout
    await new Promise((resolve, reject) => {
      // Add a longer timeout to handle large uploads on Render
      const uploadTimeout = setTimeout(() => {
        reject(new Error('Upload timed out after 5 minutes'));
      }, 300000); // 5 minutes
      
      handleUpload(req, res, (err) => {
        clearTimeout(uploadTimeout);
        if (err) {
          console.error('Multer upload error:', err);
          return reject(err);
        }
        resolve();
      });
    });
    
    if (!req.files || req.files.length === 0) {
      console.warn('No files received in upload');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Log request details
    console.log('Upload request details:', {
      filesCount: req.files.length,
      fileNames: req.files.map(f => f.originalname),
      fileSizes: req.files.map(f => f.size),
      totalSize: req.files.reduce((sum, f) => sum + f.size, 0)
    });

    const downloadCode = await generateUniqueCode();
    const fileNames = req.files.map(file => file.originalname);
    const filePaths = req.files.map(file => file.path);
    const fileSizes = req.files.map(file => file.size);
    const fileTypes = req.files.map(file => file.mimetype || 'application/octet-stream');
    const totalSize = fileSizes.reduce((sum, size) => sum + size, 0);

    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (parseInt(process.env.FILE_EXPIRY_HOURS) || 168));

    // Store in database with retry logic and cleanup on failure
    try {
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
    } catch (dbError) {
      console.error('❌ Database insertion failed for multiple files:', dbError.message);
      
      // Clean up uploaded files if database insertion fails
      try {
        await Promise.all(filePaths.map(filePath => fs.remove(filePath)));
        console.log('🧹 Cleaned up all files after database failure');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup files:', cleanupError.message);
      }
      
      // Return meaningful error with specific error code
      const errorResponse = {
        error: 'Database error - upload failed',
        message: 'Files uploaded but could not be registered due to database connection issue. Please try again.',
        code: 'DB_INSERT_FAILED',
        timestamp: new Date().toISOString(),
        suggestion: 'Check your connection and retry the upload'
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Connection', 'close');
      return res.status(500).end(JSON.stringify(errorResponse));
    }

    console.log('✅ Successfully uploaded', req.files.length, 'files with code:', downloadCode);

    // Create response object
    const responseData = {
      success: true,
      downloadCode: downloadCode,
      uploadDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      fileCount: req.files.length,
      totalSize: totalSize,
      files: fileNames
    };
    
    // Log response
    console.log('✅ Sending success response:', JSON.stringify(responseData).substring(0, 200));
    
    // Ensure we respond with a smaller payload first
    const minimalResponse = {
      success: true,
      downloadCode: downloadCode,
      uploadDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      fileCount: req.files.length,
      totalSize: totalSize
    };
    
    // Use a more resilient response method with explicit headers and flushing
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'keep-alive');
    
    // Let Express handle JSON serialization properly, with explicit end to ensure complete response
    res.end(JSON.stringify(minimalResponse));

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    
    // Get detailed request info
    const reqDetails = {
      filesCount: req.files?.length || 0,
      fileNames: req.files?.map(f => f.originalname) || [],
      fileSizes: req.files?.map(f => f.size) || [],
      totalSize: req.files?.reduce((sum, f) => sum + f.size, 0) || 0,
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'user-agent': req.headers['user-agent']
      }
    };
    
    console.log('Request details during error:', reqDetails);
    
    const errorResponse = { 
      error: 'Upload failed',
      message: error.message,
      suggestion: 'Please try again with smaller files or check your connection',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    // Log error response
    console.log('❌ Sending error response:', JSON.stringify(errorResponse).substring(0, 200));
    
    // Let Express handle error JSON serialization properly
    res.status(500).json(errorResponse);
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
    });  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// P2P upload endpoint (just generates code, files transfer via P2P)
router.post('/p2p', async (req, res) => {
  try {
    const { fileNames, fileSizes, fileTypes } = req.body;
    
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File metadata required'
      });
    }

    console.log(`🔗 P2P transfer request for ${fileNames.length} file(s)`);

    // Generate unique download code for P2P transfer
    const downloadCode = await generateUniqueCode();
    
    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);    
    
    // Save metadata to database (no actual files stored for P2P)
    const result = await pool.query(`
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
      RETURNING id, download_code, created_at
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

    const savedRecord = result.rows[0];

    console.log(`✅ P2P transfer code generated: ${downloadCode}`);

    // Create minimal response - just the core data needed by the client
    const minimalResponse = {
      success: true,
      downloadCode: downloadCode,
    };
    
    // Use a more resilient response method with explicit headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'close'); // Force connection close to ensure complete delivery
    
    // Ensure complete response with explicit end
    res.end(JSON.stringify(minimalResponse));

  } catch (error) {
    console.error('❌ P2P upload error:', error);
    res.status(500).json({
      success: false,
      error: 'P2P setup failed',
      message: error.message
    });
  }
});

// Get upload status
router.get('/status/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM files WHERE download_code = $1',
      [code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found'
      });
    }
    
    const upload = result.rows[0];
    
    res.json({
      success: true,
      downloadCode: upload.download_code,
      fileCount: upload.file_names.length,
      files: upload.file_names,
      totalSize: upload.file_sizes.reduce((sum, size) => sum + parseInt(size), 0),
      isP2P: upload.is_p2p || false,
      createdAt: upload.created_at,
      expiresAt: upload.expires_at
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check upload status'
    });
  }
});

// Fallback upload for existing P2P codes (when P2P fails)
router.post('/fallback/:code', upload.array('files', 10), async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log(`🔄 Fallback upload request for code: ${code}`);
    console.log(`📁 Files received: ${req.files ? req.files.length : 0}`);
    
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files in fallback request');
      return res.status(400).json({ error: 'No files uploaded' });
    }    // Check if the code exists and is a P2P transfer
    console.log(`🔍 Checking for existing P2P record with code: ${code}`);
    const existingRecord = await pool.query(
      'SELECT * FROM files WHERE download_code = $1 AND upload_status = $2',
      [code, 'p2p']
    );

    console.log(`📊 Found ${existingRecord.rows.length} P2P records for code: ${code}`);

    if (existingRecord.rows.length === 0) {
      console.log('❌ P2P transfer not found or already completed');
      return res.status(404).json({ 
        error: 'P2P transfer not found or already completed' 
      });
    }

    const fileNames = req.files.map(file => file.originalname);
    const filePaths = req.files.map(file => file.path);
    const fileSizes = req.files.map(file => file.size);
    const fileTypes = req.files.map(file => file.mimetype || 'application/octet-stream');    // Update the existing record with actual file data
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

    // Use the same minimal response pattern for consistency and reliability
    const minimalResponse = {
      success: true,
      downloadCode: code,
      fileCount: req.files.length
    };
    
    // Use a more resilient response method with explicit headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'close'); // Force connection close to ensure complete delivery
    
    // Ensure complete response with explicit end
    res.end(JSON.stringify(minimalResponse));

  } catch (error) {
    console.error('❌ Fallback upload error:', error);
    res.status(500).json({ 
      error: 'Fallback upload failed',
      message: error.message 
    });
  }
});

module.exports = router;
