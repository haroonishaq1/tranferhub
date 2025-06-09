const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available (Render.com provides this)
// Otherwise fall back to individual connection parameters
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'file_transfer',
      password: process.env.DB_PASSWORD || 'Haroon21@',
      port: process.env.DB_PORT || 5432,
    };

// Add connection pool settings optimized for Render.com with connection reset handling
const renderOptimizedConfig = {
  ...poolConfig,
  // Reduce max clients to prevent overwhelming the database
  max: process.env.NODE_ENV === 'production' ? 3 : 8,
  // Reduce minimum connections to 0 to avoid holding idle connections
  min: 0,
  // Set idle timeout to 30 seconds to allow for longer operations
  idleTimeoutMillis: 30000,
  // Increase connection timeout to handle network delays
  connectionTimeoutMillis: 15000,
  // Enable keepalive to detect broken connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Add application name for easier debugging
  application_name: 'p2p-file-transfer',
};

const pool = new Pool(renderOptimizedConfig);

// Smart retry function - only for connection errors, NOT SQL errors
async function retryConnectionOnly(queryText, values, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use original pool.query directly to avoid infinite loops
      const result = await pool.query(queryText, values);
      
      if (attempt > 1) {
        console.log(`✅ DB Query succeeded on retry attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Only retry for actual connection errors
      const isConnectionError = error.code === 'ECONNRESET' || 
                               error.code === 'ENOTFOUND' || 
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ECONNREFUSED' ||
                               error.message?.includes('Connection reset') ||
                               error.message?.includes('connection terminated') ||
                               error.message?.includes('server closed the connection');
      
      if (!isConnectionError) {
        // Don't retry SQL errors, constraint violations, etc.
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`💥 Connection failed after ${attempt} attempts`);
        throw error;
      }
      
      console.log(`🔄 Connection retry ${attempt}/${maxRetries} due to: ${error.message}`);
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

// Enhanced pool with smart retry - ONLY for connection issues
const enhancedPool = {
  query: async function(queryText, values) {
    try {
      // Try direct query first - NO automatic retry logging
      return await pool.query(queryText, values);
    } catch (error) {
      // Only retry for specific connection errors, NOT SQL errors
      const isConnectionError = error.code === 'ECONNRESET' || 
                               error.code === 'ENOTFOUND' || 
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ECONNREFUSED' ||
                               error.message?.includes('Connection reset') ||
                               error.message?.includes('connection terminated') ||
                               error.message?.includes('server closed the connection');
                         
      if (isConnectionError) {
        console.log('🔄 Connection issue detected, attempting smart retry...');
        return await retryConnectionOnly(queryText, values, 2);
      } else {
        // Don't retry SQL errors, constraint violations, etc.
        // These should fail immediately
        throw error;
      }
    }
  },
  // Keep original query method available
  directQuery: function(queryText, values) {
    return pool.query(queryText, values);
  },
  // Proxy other pool methods
  connect: function() { return pool.connect(); },
  end: function() { return pool.end(); },
  on: function(event, callback) { return pool.on(event, callback); },
  removeListener: function(event, callback) { return pool.removeListener(event, callback); },
  // Add other properties
  get totalCount() { return pool.totalCount; },
  get idleCount() { return pool.idleCount; },
  get waitingCount() { return pool.waitingCount; }
};

// Test connection with proper client handling
pool.on('connect', (client) => {
  console.log('📁 Connected to PostgreSQL database');
  // Set connection parameters for stability
  client.query('SET statement_timeout = 30000').catch(err => {
    console.warn('Failed to set statement_timeout:', err.message);
  });
  client.query('SET idle_in_transaction_session_timeout = 60000').catch(err => {
    console.warn('Failed to set idle_in_transaction_session_timeout:', err.message);
  });
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  console.error('❌ Error details:', {
    code: err.code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Add connection monitoring
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

pool.on('acquire', () => {
  connectionAttempts = 0; // Reset on successful connection
});

pool.on('remove', (err) => {
  connectionAttempts++;
  const errorMessage = err?.message || 'Unknown connection error';
  console.warn(`⚠️ Database connection removed (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`, errorMessage);
  
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.error('💥 Database connection failure threshold reached');
    // Reset counter after threshold to allow recovery
    setTimeout(() => {
      connectionAttempts = 0;
      console.log('🔄 Reset connection attempt counter');
    }, 60000); // Reset after 1 minute
  }
});

module.exports = enhancedPool;
