#!/usr/bin/env node

/**
 * Database Setup and Fix Script
 * This script will:
 * 1. Check database connectivity
 * 2. Initialize database tables if needed
 * 3. Run any pending migrations
 * 4. Verify the database is working properly
 */

const pool = require('./config/database');
const fs = require('fs-extra');
const path = require('path');

async function checkDatabaseConnection() {
  console.log('🔍 Step 1: Testing database connection...');
  
  try {
    const result = await pool.directQuery('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database Connection Help:');
      console.log('   - Make sure PostgreSQL is installed and running');
      console.log('   - Check your DATABASE_URL or database credentials in .env');
      console.log('   - Try running: brew services start postgresql (macOS)');
      console.log('   - Or run: docker-compose up -d postgres (if using Docker)');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Database Host Not Found:');
      console.log('   - Check your database host configuration');
      console.log('   - Verify DATABASE_URL is correct');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication Failed:');
      console.log('   - Check your database username and password');
      console.log('   - Verify credentials in .env file');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database Does Not Exist:');
      console.log('   - Create the database: createdb file_transfer');
      console.log('   - Or check your database name in .env');
    }
    
    return false;
  }
}

async function checkAndCreateTables() {
  console.log('\n🔍 Step 2: Checking database schema...');
  
  try {
    // Check if tables exist
    const tablesResult = await pool.directQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📊 Existing tables:', existingTables);
    
    // Check if we need to create tables
    if (!existingTables.includes('files')) {
      console.log('🔨 Creating files table...');
      await pool.directQuery(`
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
          max_downloads INTEGER DEFAULT NULL,
          ip_address INET,
          user_agent TEXT,
          is_p2p BOOLEAN DEFAULT FALSE,
          p2p_enabled BOOLEAN DEFAULT TRUE,
          upload_status VARCHAR(20) DEFAULT 'completed'
        )
      `);
      console.log('✅ Files table created');
    }
    
    if (!existingTables.includes('download_logs')) {
      console.log('🔨 Creating download_logs table...');
      await pool.directQuery(`
        CREATE TABLE IF NOT EXISTS download_logs (
          id SERIAL PRIMARY KEY,
          download_code VARCHAR(6) NOT NULL,
          download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address INET,
          user_agent TEXT
        )
      `);
      console.log('✅ Download_logs table created');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('\n🔍 Step 3: Running database migrations...');
  
  try {
    // Check and add missing columns
    const columnsResult = await pool.directQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns);
    
    // Add missing columns
    const requiredColumns = [
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'server_file_names', type: 'TEXT[]' },
      { name: 'upload_status', type: 'VARCHAR(20) DEFAULT \'completed\'' },
      { name: 'is_p2p', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'p2p_enabled', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'max_downloads', type: 'INTEGER DEFAULT NULL' }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`🔨 Adding column: ${column.name}`);
        await pool.directQuery(`ALTER TABLE files ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      }
    }
    
    console.log('✅ All migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

async function testOperations() {
  console.log('\n🔍 Step 4: Testing database operations...');
  
  try {
    // Test insert
    const testCode = '999999';
    await pool.directQuery(`
      INSERT INTO files (download_code, file_names, file_paths, file_sizes, file_types, expires_at, upload_status) 
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour', $6)
      ON CONFLICT (download_code) DO NOTHING
    `, [testCode, ['test.txt'], ['/tmp/test.txt'], [1024], ['text/plain'], 'completed']);
    
    // Test select
    const result = await pool.directQuery('SELECT * FROM files WHERE download_code = $1', [testCode]);
    if (result.rows.length > 0) {
      console.log('✅ Insert/Select operations working');
    }
    
    // Test delete (cleanup)
    await pool.directQuery('DELETE FROM files WHERE download_code = $1', [testCode]);
    console.log('✅ Delete operation working');
    
    console.log('✅ All database operations working correctly');
    return true;
  } catch (error) {
    console.error('❌ Database operation test failed:', error.message);
    return false;
  }
}

async function showDatabaseInfo() {
  console.log('\n📊 Database Information:');
  
  try {
    // Get connection info
    const connResult = await pool.directQuery('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
    const conn = connResult.rows[0];
    
    console.log(`   Database: ${conn.current_database}`);
    console.log(`   User: ${conn.current_user}`);
    console.log(`   Host: ${conn.inet_server_addr || 'localhost'}`);
    console.log(`   Port: ${conn.inet_server_port || 'N/A'}`);
    
    // Get table info
    const tableResult = await pool.directQuery(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tables:');
    tableResult.rows.forEach(table => {
      console.log(`   - ${table.tablename}: ${table.size}`);
    });
    
    // Get record counts
    const filesCount = await pool.directQuery('SELECT COUNT(*) as count FROM files');
    const logsCount = await pool.directQuery('SELECT COUNT(*) as count FROM download_logs');
    
    console.log('\n📈 Record Counts:');
    console.log(`   - Files: ${filesCount.rows[0].count}`);
    console.log(`   - Download Logs: ${logsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Failed to get database info:', error.message);
  }
}

async function main() {
  console.log('🚀 P2P Transfer Database Setup & Fix Script');
  console.log('===========================================\n');
  
  try {
    // Step 1: Check connection
    const connectionOk = await checkDatabaseConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    // Step 2: Create tables
    const tablesOk = await checkAndCreateTables();
    if (!tablesOk) {
      process.exit(1);
    }
    
    // Step 3: Run migrations
    const migrationsOk = await runMigrations();
    if (!migrationsOk) {
      process.exit(1);
    }
    
    // Step 4: Test operations
    const operationsOk = await testOperations();
    if (!operationsOk) {
      process.exit(1);
    }
    
    // Show info
    await showDatabaseInfo();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('✅ Your P2P Transfer application should now work properly.');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Setup interrupted by user');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled promise rejection:', reason);
  await pool.end();
  process.exit(1);
});

// Run the setup
main().catch(console.error);
