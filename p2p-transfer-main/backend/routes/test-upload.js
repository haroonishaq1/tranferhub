const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();

// Test database connection
try {
  const pool = require('../config/database');
  console.log('✅ Database pool imported successfully');
} catch (error) {
  console.error('❌ Database pool import failed:', error.message);
}

// Simple test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Test upload route is working',
    timestamp: new Date().toISOString()
  });
});

// Test multer configuration
const upload = multer({ 
  dest: '/tmp/uploads',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

router.post('/test', upload.single('file'), (req, res) => {
  res.json({
    success: true,
    message: 'Multer upload test working',
    file: req.file ? req.file.filename : 'no file',
    timestamp: new Date().toISOString()
  });
});

// Test database operations
router.post('/db-test', async (req, res) => {
  try {
    const pool = require('../config/database');
    const result = await pool.query('SELECT 1 as test');
    res.json({
      success: true,
      message: 'Database test successful',
      result: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Test upload POST is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
