const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure server timeouts for large uploads
server.timeout = 300000; // 5 minutes
server.requestTimeout = 300000; // 5 minutes
server.headersTimeout = 300000; // 5 minutes
server.keepAliveTimeout = 60000; // 1 minute - Better for Render.com

// Set memory optimizations for Render.com free tier
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // Schedule regular garbage collection if running in production
  const scheduleGC = () => {
    if (global.gc) {
      console.log('🧹 Running manual garbage collection');
      global.gc();
    }
    // Run GC every 5 minutes
    setTimeout(scheduleGC, 5 * 60 * 1000);
  };
  
  // Call once on startup
  scheduleGC();
}

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001',
      'https://p2p-transfer-frontend.onrender.com',
      'https://p2p-transfer-frontend.onrender.com/',
      'https://*.onrender.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://p2p-transfer-frontend.onrender.com',
    'https://p2p-transfer-frontend.onrender.com/',
    'https://*.onrender.com'
  ],
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Use compression for all responses
app.use(compression({
  // Compress everything above 10 bytes
  threshold: 10,
  // Don't compress responses with this request header
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
// Configure express.json() with error handling
app.use(express.json({ 
  limit: '100gb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON received:', e.message);
      res.status(400).json({ 
        error: 'Invalid JSON in request body', 
        details: e.message,
        suggestion: 'Check your request payload format'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({ 
      error: 'Invalid JSON in request body',
      details: err.message 
    });
  }
  next();
});

app.use(express.urlencoded({ extended: true, limit: '100gb' }));

// Add database health monitoring for connection reset issues
const pool = require('./config/database');

let dbHealthStatus = { 
  connected: false, 
  lastCheck: null, 
  consecutiveFailures: 0,
  lastError: null,
  responseTime: null
};

async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await pool.directQuery('SELECT 1 as health_check');
    const duration = Date.now() - start;
    
    const wasDown = dbHealthStatus.consecutiveFailures > 0;
    
    dbHealthStatus = {
      connected: true,
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0,
      responseTime: duration,
      lastError: null
    };
    
    if (wasDown) {
      console.log(`✅ Database connection restored after ${dbHealthStatus.consecutiveFailures} failures (${duration}ms)`);
    }
    
    return true;
  } catch (error) {
    dbHealthStatus.consecutiveFailures++;
    dbHealthStatus.connected = false;
    dbHealthStatus.lastCheck = new Date().toISOString();
    dbHealthStatus.lastError = error.message;
    
    console.error(`❌ Database health check failed (attempt ${dbHealthStatus.consecutiveFailures}):`, {
      error: error.message,
      code: error.code,
      hint: error.code === 'ECONNRESET' ? 'Connection reset by peer - network instability detected' : 'Database connection issue'
    });
    
    return false;
  }
}

// Run database health checks every 30 seconds
const healthCheckInterval = setInterval(checkDatabaseHealth, 30000);
checkDatabaseHealth(); // Initial check

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Routes with error handling
try {
  console.log('Loading fixed upload route...');
  app.use('/api/upload', require('./routes/upload-fixed'));
  console.log('✅ Fixed upload route loaded successfully');
} catch (error) {
  console.error('❌ Failed to load fixed upload route:', error.message);
}

try {
  console.log('Loading upload-minimal route...');
  app.use('/api/upload-minimal', require('./routes/upload-minimal')); // Minimal response API for better reliability
  console.log('✅ Upload-minimal route loaded successfully');
} catch (error) {
  console.error('❌ Failed to load upload-minimal route:', error.message);
}

try {
  console.log('Loading chunked-upload route...');
  app.use('/api/chunked-upload', require('./routes/chunked-upload-simple'));
  console.log('✅ Chunked-upload route loaded successfully');
} catch (error) {
  console.error('❌ Failed to load chunked-upload route:', error.message);
}

try {
  console.log('Loading download route...');
  app.use('/api/download', require('./routes/download'));
  console.log('✅ Download route loaded successfully');
} catch (error) {
  console.error('❌ Failed to load download route:', error.message);
}

try {
  console.log('Loading signaling route...');
  app.use('/api/signaling', require('./routes/signaling'));
  console.log('✅ Signaling route loaded successfully');
} catch (error) {
  console.error('❌ Failed to load signaling route:', error.message);
}

// Initialize signaling server with Socket.IO
const { initializeSignaling } = require('./routes/signaling');
initializeSignaling(io);

// Health check endpoint - production ready with detailed diagnostics including database status
app.get('/api/health', async (req, res) => {
  // Collect basic system metrics
  const usedMemory = process.memoryUsage();
  const uptime = process.uptime();
  const numConnections = server._connections; // Active connections
  
  // Perform a quick database health check
  let databaseStatus = 'unknown';
  let dbResponseTime = null;
  try {
    const start = Date.now();
    await pool.directQuery('SELECT 1');
    dbResponseTime = Date.now() - start;
    databaseStatus = 'healthy';
  } catch (error) {
    databaseStatus = 'error';
    console.error('Health check database error:', error.message);
  }
  
  const healthData = { 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)} minutes, ${Math.floor(uptime % 60)} seconds`,
    memory: {
      rss: `${Math.round(usedMemory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usedMemory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usedMemory.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usedMemory.external / 1024 / 1024)} MB`,
    },
    connections: numConnections,
    database: {
      status: databaseStatus,
      lastCheck: dbHealthStatus.lastCheck,
      consecutiveFailures: dbHealthStatus.consecutiveFailures,
      responseTime: dbResponseTime || dbHealthStatus.responseTime,
      lastError: dbHealthStatus.lastError
    },
    // Add environment indicators
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      isProduction: process.env.NODE_ENV === 'production',
      isRender: !!process.env.RENDER,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured'
    }
  };
  
  // Set appropriate status code based on database health
  const statusCode = databaseStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// API information endpoint
app.get('/api/info', (req, res) => {
  res.json({ 
    name: 'P2P File Transfer API',
    version: '1.1.0',
    status: 'online', 
    timestamp: new Date().toISOString(),
    routes: [
      { path: '/api/upload', description: 'File upload endpoints' },
      { path: '/api/download', description: 'File download endpoints' },
      { path: '/api/signaling', description: 'WebRTC signaling endpoints' }
    ]
  });
});

// Catch-all route for handling API 404 errors
app.use('/api/*', (req, res) => {
  console.error(`Route not found: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API route not found', 
    requestedPath: req.originalUrl,
    availableRoutes: [
      '/api/upload',
      '/api/download',
      '/api/signaling',
      '/api/health',
      '/api/info'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler - Must be after all other routes
app.use('/api/*', (req, res) => {
  console.log(`🚫 Route not found: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `The requested API endpoint ${req.originalUrl} does not exist`,
    availableRoutes: ['/api/upload', '/api/download', '/api/signaling', '/api/health']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 P2P signaling server enabled`);
});

module.exports = { app, server, io };
