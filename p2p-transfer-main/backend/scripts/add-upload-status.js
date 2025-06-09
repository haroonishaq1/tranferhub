const pool = require('../config/database');

async function addUploadStatusColumn() {
  try {
    console.log('Adding upload_status column to files table...');
    
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'upload_status'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('upload_status column already exists!');
      return;
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE files 
      ADD COLUMN upload_status VARCHAR(20) DEFAULT 'completed'
    `);
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_files_upload_status ON files(upload_status)
    `);
    
    console.log('Successfully added upload_status column with index');
    
  } catch (error) {
    console.error('Error adding upload_status column:', error);
  } finally {
    process.exit(0);
  }
}

addUploadStatusColumn();
