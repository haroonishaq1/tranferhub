const pool = require('../config/database');

async function initializeDatabase() {
  try {
    console.log('🔨 Initializing database...');    // Create files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        download_code VARCHAR(6) UNIQUE NOT NULL,
        file_names TEXT[] NOT NULL,
        file_paths TEXT[] NOT NULL,
        file_sizes BIGINT[] NOT NULL,
        file_types TEXT[] NOT NULL,
        server_file_names TEXT[],
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        download_count INTEGER DEFAULT 0,
        max_downloads INTEGER DEFAULT NULL,        ip_address INET,
        user_agent TEXT,
        is_p2p BOOLEAN DEFAULT FALSE,
        p2p_enabled BOOLEAN DEFAULT TRUE,
        upload_status VARCHAR(20) DEFAULT 'completed'
      )
    `);

    // Create download logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS download_logs (
        id SERIAL PRIMARY KEY,
        download_code VARCHAR(6) NOT NULL,
        download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        FOREIGN KEY (download_code) REFERENCES files(download_code) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_download_code ON files(download_code);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON files(expires_at);
    `);

    console.log('✅ Database initialized successfully');
    
    // Run migrations for existing tables
    console.log('🔄 Running database migrations...');
    
    // Add created_at column if missing
    try {
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
        console.log('✅ Added created_at column');
      } else {
        console.log('ℹ️ created_at column already exists');
      }
    } catch (migrationError) {
      console.error('⚠️ Migration warning for created_at:', migrationError.message);
    }
    
    // Add upload_status column if missing
    try {
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
        console.log('✅ Added upload_status column');
      } else {
        console.log('ℹ️ upload_status column already exists');
      }
    } catch (migrationError) {
      console.error('⚠️ Migration warning for upload_status:', migrationError.message);
    }
    
    console.log('✅ Migrations completed');
    
    // Test insert and select
    console.log('🧪 Running database test...');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('📅 Database time:', testResult.rows[0].current_time);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Run initialization if this script is called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
