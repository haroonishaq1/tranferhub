// This is an optimized version of the upload router with minimal response payloads
// for better reliability on platforms like Render.com's free tier

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
    cb(null, true);
  }
});

// Generate 6-digit code
function generateDownloadCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if code exists in database
async function isCodeUnique(code) {
  const result = await pool.query(
    'SELECT download_code FROM files WHERE download_code = $1',
    [code]
  );
  return result.rows.length === 0;
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

// MINIMAL UPLOAD ROUTES WITH OPTIMIZED RESPONSES

// Handle GET requests to P2P endpoint (prevents 404 errors)
router.get('/p2p', (req, res) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'P2P upload requires POST method with file metadata',
    allowedMethods: ['POST'],
    example: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        fileNames: ['example.txt'],
        fileSizes: [1024],
        fileTypes: ['text/plain']
      }
    }
  });
});

// P2P upload endpoint - minimal response
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
      RETURNING id, download_code
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

    // Return minimal response for better reliability
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'close'); // Close connection after sending
    res.end(JSON.stringify({
      success: true,
      downloadCode: downloadCode,
    }));

  } catch (error) {
    console.error('❌ P2P upload error:', error);
    res.status(500).json({
      success: false,
      error: 'P2P setup failed'
    });
  }
});

// Multiple files upload with minimal response
router.post('/multiple', async (req, res) => {
  console.log('Received upload request from', req.ip);
  
  // Create upload middleware with error handling
  const handleUpload = upload.array('files', 10);
  let downloadCode;
  
  try {
    // Handle multer errors with a promise wrapper and timeout
    await new Promise((resolve, reject) => {
      // Add timeout to handle large uploads
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
      return res.status(400).json({ error: 'No files uploaded' });
    }

    downloadCode = await generateUniqueCode();
    const fileNames = req.files.map(file => file.originalname);
    const filePaths = req.files.map(file => file.path);
    const fileSizes = req.files.map(file => file.size);
    const fileTypes = req.files.map(file => file.mimetype || 'application/octet-stream');
    const totalSize = fileSizes.reduce((sum, size) => sum + size, 0);

    // Calculate expiry date (7 days from now)
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

    console.log('✅ Successfully uploaded', req.files.length, 'files with code:', downloadCode);

    // Minimal response - just the most important info
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Connection', 'close');
    res.end(JSON.stringify({ 
      success: true, 
      downloadCode: downloadCode,
    }));

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
    });
  }
});

module.exports = router;
