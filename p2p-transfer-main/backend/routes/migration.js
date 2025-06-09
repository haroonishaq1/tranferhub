const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Migration endpoint to add missing database columns
router.post('/add-created-at', async (req, res) => {
  try {
    console.log('🔨 Running database migration: adding created_at column...');
    
    // Check if created_at column already exists
    const checkCreatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'created_at'
    `);
    
    if (checkCreatedAt.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log('✅ created_at column added successfully');
      res.json({
        success: true,
        message: 'created_at column added successfully',
        action: 'added'
      });
    } else {
      console.log('ℹ️ created_at column already exists');
      res.json({
        success: true,
        message: 'created_at column already exists',
        action: 'skipped'
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// Migration endpoint to add missing server_file_names column
router.post('/add-server-file-names', async (req, res) => {
  try {
    console.log('🔨 Running database migration: adding server_file_names column...');
    
    // Check if server_file_names column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'server_file_names'
    `);
    
    if (checkColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN server_file_names TEXT[]
      `);
      
      console.log('✅ server_file_names column added successfully');
      res.json({
        success: true,
        message: 'server_file_names column added successfully',
        action: 'added'
      });
    } else {
      console.log('ℹ️ server_file_names column already exists');
      res.json({
        success: true,
        message: 'server_file_names column already exists',
        action: 'skipped'
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// Run all missing migrations
router.post('/run-all', async (req, res) => {
  try {
    console.log('🔨 Running all database migrations...');
    
    const results = [];
    
    // Add created_at column
    const checkCreatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'created_at'
    `);
    
    if (checkCreatedAt.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      results.push('created_at column added');
      console.log('✅ created_at column added successfully');
    } else {
      results.push('created_at column already exists');
      console.log('ℹ️ created_at column already exists');
    }
    
    // Add server_file_names column
    const checkServerFileNames = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'server_file_names'
    `);
    
    if (checkServerFileNames.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN server_file_names TEXT[]
      `);
      results.push('server_file_names column added');
      console.log('✅ server_file_names column added successfully');
    } else {
      results.push('server_file_names column already exists');
      console.log('ℹ️ server_file_names column already exists');
    }
    
    // Add upload_status column if missing
    const checkUploadStatus = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'upload_status'
    `);
    
    if (checkUploadStatus.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN upload_status VARCHAR(20) DEFAULT 'completed'
      `);
      results.push('upload_status column added');
      console.log('✅ upload_status column added successfully');
    } else {
      results.push('upload_status column already exists');
      console.log('ℹ️ upload_status column already exists');
    }
    
    res.json({
      success: true,
      message: 'All migrations completed',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// Get current database schema
router.get('/schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files'
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      table: 'files',
      columns: result.rows
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Schema check failed',
      message: error.message
    });
  }
});

module.exports = router;
