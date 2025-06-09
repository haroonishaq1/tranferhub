const pool = require('../config/database');

async function addServerFileNamesColumn() {
  try {
    console.log('🔨 Adding server_file_names column...');
    
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'server_file_names'
    `);
    
    if (checkColumn.rows.length === 0) {
      // Add the missing column
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN server_file_names TEXT[]
      `);
      
      console.log('✅ server_file_names column added successfully');
    } else {
      console.log('ℹ️ server_file_names column already exists');
    }
      // Also check and add created_at if missing
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
    } else {
      console.log('ℹ️ created_at column already exists');
    }
    
    // Check and add is_p2p if missing
    const checkIsP2P = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'is_p2p'
    `);
    
    if (checkIsP2P.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN is_p2p BOOLEAN DEFAULT FALSE
      `);
      
      console.log('✅ is_p2p column added successfully');
    } else {
      console.log('ℹ️ is_p2p column already exists');
    }
    
    // Check and add p2p_enabled if missing
    const checkP2PEnabled = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'p2p_enabled'
    `);
    
    if (checkP2PEnabled.rows.length === 0) {
      await pool.query(`
        ALTER TABLE files 
        ADD COLUMN p2p_enabled BOOLEAN DEFAULT TRUE
      `);
      
      console.log('✅ p2p_enabled column added successfully');
    } else {
      console.log('ℹ️ p2p_enabled column already exists');
    }
    
    console.log('🎉 Database migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addServerFileNamesColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
