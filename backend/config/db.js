const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.production') });
dotenv.config();

// Database connection
let pool;
if (process.env.DATABASE_URL) {
  // Production mode (Render) - DATABASE_URL is provided by Render PostgreSQL service
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('Using DATABASE_URL for database connection');
} else {
  // Local development with individual env vars
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });
  console.log('Using individual env vars for database connection');
}

const setupDatabase = async () => {
  try {
    // Test the connection first
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Create users table (optional, for registered users)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);// Create transfer_sessions table for P2P file transfers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transfer_sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) NOT NULL UNIQUE,
        sender_socket_id VARCHAR(100) NOT NULL,
        receiver_socket_id VARCHAR(100),
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Create transfer_stats table for analytics (optional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transfer_stats (
        id SERIAL PRIMARY KEY,
        transfer_code VARCHAR(6) NOT NULL,
        file_count INTEGER,
        total_size BIGINT,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error setting up database:', err.message);
    console.log('Note: Some features may not work without a database connection');
  }
};

module.exports = { pool, setupDatabase };
