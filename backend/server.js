const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const memoryStorage = require('./storage/memoryStorage');

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });
dotenv.config(); // This will load backend/.env for local development

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connection
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Local development with individual env vars
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Make DB and memory storage accessible to routes
app.use((req, res, next) => {
  req.db = pool;
  req.memoryStorage = memoryStorage;
  next();
});

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Route for receive page (QR code links)
app.get('/receive/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/api', (req, res) => {
  res.json({ message: 'SendAnywhere Clone API is running' });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Socket.io connection for real-time file transfers
io.on('connection', (socket) => {
  console.log('New client connected with socket ID:', socket.id);
  
  // Store socket ID for debugging
  socket.socketConnectedAt = new Date().toISOString();
  
  // Generate a 6-digit random code for the sender
  socket.on('generate-code', async () => {
    try {
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`Generating code ${code} for socket ${socket.id}`);
      
      // Try to store in database first, fallback to memory storage
      let session;
      try {
        const result = await pool.query(
          'INSERT INTO transfer_sessions (code, sender_socket_id, created_at, expires_at) VALUES ($1, $2, NOW(), NOW() + INTERVAL \'10 minutes\') RETURNING *',
          [code, socket.id]
        );
        session = result.rows[0];
        console.log('Code stored in database successfully');
      } catch (dbError) {
        console.log('Database not available, using memory storage');
        session = memoryStorage.createTransferSession(code, socket.id);
        console.log('Code stored in memory storage successfully');
      }
      
      // Send the code back to the sender
      socket.emit('code-generated', { code });
      console.log(`Code ${code} sent to client ${socket.id}`);
      
      // Set a timeout to expire the code after 10 minutes
      setTimeout(async () => {
        try {
          // Try database first, then memory storage
          try {
            await pool.query('DELETE FROM transfer_sessions WHERE code = $1', [code]);
          } catch (dbError) {
            memoryStorage.deleteTransferSession(code);
          }
          socket.emit('code-expired', { code });
          console.log(`Code ${code} expired`);
        } catch (error) {
          console.error('Error expiring code:', error);
        }
      }, 10 * 60 * 1000); // 10 minutes in milliseconds
      
    } catch (error) {
      console.error('Error generating code:', error);
      socket.emit('error', { message: 'Failed to generate code' });
    }
  });
  // Handle receiver entering a code
  socket.on('join-room', async (data) => {
    try {
      const { code } = data;
      console.log(`User ${socket.id} attempting to join room with code: ${code}`);
      
      // Find the transfer session with this code
      let session;
      try {
        const result = await pool.query(
          'SELECT * FROM transfer_sessions WHERE code = $1 AND expires_at > NOW()',
          [code]
        );
        session = result.rows[0];
        console.log('Database query result:', session ? 'Session found' : 'No session found');
      } catch (dbError) {
        console.log('Database not available, using memory storage');
        session = memoryStorage.getTransferSession(code);
        console.log('Memory storage result:', session ? 'Session found' : 'No session found');
      }
      
      if (!session) {
        console.log(`Invalid or expired code: ${code}`);
        return socket.emit('error', { message: 'Invalid or expired code' });
      }
      
      const senderSocketId = session.sender_socket_id;
      console.log(`Found session. Sender socket ID: ${senderSocketId}`);
        // Notify the sender that a receiver has joined
      console.log(`Notifying sender ${senderSocketId} that receiver ${socket.id} has joined`);
      io.to(senderSocketId).emit('receiver-joined', { 
        receiverSocketId: socket.id 
      });
      
      // Notify the receiver that they've successfully joined
      console.log(`Notifying receiver ${socket.id} about successful connection to sender ${senderSocketId}`);
      socket.emit('joined-room', { 
        senderSocketId: senderSocketId,
        code 
      });
      
      console.log(`Successfully connected ${socket.id} to sender ${senderSocketId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  // Handle WebRTC signaling
  socket.on('signal', (data) => {
    console.log(`Signal from ${socket.id} to ${data.to}:`, data.signal?.type || 'unknown');
    
    if (!data.to) {
      console.error('Signal missing target socket ID');
      socket.emit('error', { message: 'Invalid signal: missing target' });
      return;
    }
    
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket) {
      targetSocket.emit('signal', {
        from: socket.id,
        signal: data.signal
      });
      console.log(`Signal successfully relayed from ${socket.id} to ${data.to} (${data.signal?.type || 'unknown'})`);
    } else {
      console.log(`Target socket ${data.to} not found or disconnected`);
      socket.emit('error', { message: 'Target peer not found or disconnected' });
      
      // Notify the sender that the receiver is no longer available
      socket.emit('peer-disconnected', { socketId: data.to });
    }
  });
    // Handle transfer complete
  socket.on('transfer-complete', async (data) => {
    try {
      const { code } = data;
      
      // Log the successful transfer
      try {
        await pool.query(
          'UPDATE transfer_sessions SET completed = TRUE WHERE code = $1',
          [code]
        );
        await pool.query('DELETE FROM transfer_sessions WHERE code = $1', [code]);
      } catch (dbError) {
        console.log('Database not available, using memory storage');
        memoryStorage.updateTransferSession(code, { completed: true });
        memoryStorage.deleteTransferSession(code);
      }
      
    } catch (error) {
      console.error('Error completing transfer:', error);
    }
  });
  
  // Handle relay transfer (fallback for WebRTC failures)
  socket.on('relay-transfer', async (data) => {
    try {
      const { code, files } = data;
      console.log(`Relay transfer request for code ${code} with ${files?.length} files`);
      
      // Find the receiver for this code
      let session;
      try {
        const result = await pool.query(
          'SELECT * FROM transfer_sessions WHERE code = $1 AND expires_at > NOW()',
          [code]
        );
        session = result.rows[0];
      } catch (dbError) {
        console.log('Database not available, using memory storage');
        session = memoryStorage.getTransferSession(code);
      }
      
      if (!session) {
        console.log(`No valid session found for code: ${code}`);
        socket.emit('error', { message: 'Invalid or expired code' });
        return;
      }
      
      // Get all connected sockets for this session
      const senderSocketId = session.sender_socket_id;
      const receiverSocketId = session.receiver_socket_id;
      
      // If this is the sender, relay to receiver
      if (socket.id === senderSocketId && receiverSocketId) {
        const receiverSocket = io.sockets.sockets.get(receiverSocketId);
        if (receiverSocket) {
          console.log(`Relaying ${files.length} files from ${senderSocketId} to ${receiverSocketId}`);
          receiverSocket.emit('relay-transfer', {
            code: code,
            files: files
          });
          console.log('Files relayed successfully');
        } else {
          console.log(`Receiver socket ${receiverSocketId} not found`);
          socket.emit('error', { message: 'Receiver not available' });
        }
      } else {
        console.log(`Invalid relay request from ${socket.id} for session sender: ${senderSocketId}`);
        socket.emit('error', { message: 'Invalid relay request' });
      }
      
    } catch (error) {
      console.error('Error handling relay transfer:', error);
      socket.emit('error', { message: 'Relay transfer failed' });
    }
  });
    // Enhanced server relay handlers for cross-device transfers
  socket.on('relay-file-upload', async (data) => {
    try {
      const { code, fileData, fileIndex, totalFiles } = data;
      
      // Validate input data
      if (!code || !fileData || fileIndex === undefined || !totalFiles) {
        socket.emit('relay-error', { 
          error: 'Invalid upload data provided' 
        });
        return;
      }
      
      if (!fileData.name || !fileData.data) {
        socket.emit('relay-error', { 
          error: 'File data is incomplete' 
        });
        return;
      }
      
      console.log(`📤 Relay file upload for code ${code}: ${fileData.name} (${fileIndex + 1}/${totalFiles}) - ${fileData.size} bytes`);
      
      // Validate file size (limit to 100MB per file)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (fileData.size > maxFileSize) {
        socket.emit('relay-error', { 
          error: `File ${fileData.name} is too large. Maximum size is 100MB.` 
        });
        return;
      }
      
      // Store file in memory storage with the transfer code
      try {
        memoryStorage.storeRelayFile(code, fileIndex, fileData);
      } catch (storageError) {
        console.error('Storage error:', storageError);
        socket.emit('relay-error', { 
          error: 'Failed to store file on server' 
        });
        return;
      }
      
      // Acknowledge file upload
      socket.emit('relay-file-upload-ack', {
        fileName: fileData.name,
        fileIndex: fileIndex,
        code: code
      });
      
      console.log(`✅ File ${fileData.name} stored successfully for code ${code}`);
      
    } catch (error) {
      console.error('❌ Error handling relay file upload:', error);
      socket.emit('relay-error', { 
        error: 'Failed to upload file to server: ' + error.message 
      });
    }
  });
    socket.on('relay-upload-complete', async (data) => {
    try {
      const { code, totalFiles } = data;
      
      // Validate input
      if (!code || !totalFiles) {
        socket.emit('relay-error', { 
          error: 'Invalid completion data provided' 
        });
        return;
      }
      
      console.log(`📋 Relay upload complete for code ${code}, ${totalFiles} files`);
      
      // Mark upload as complete in memory storage
      try {
        memoryStorage.markUploadComplete(code, totalFiles);
      } catch (storageError) {
        console.error('Storage error during completion:', storageError);
        socket.emit('relay-error', { 
          error: 'Failed to mark upload as complete' 
        });
        return;
      }
      
      // Acknowledge upload completion
      socket.emit('relay-upload-complete-ack', {
        code: code,
        totalFiles: totalFiles
      });
      
      console.log(`✅ Upload marked complete for code ${code}`);
      
    } catch (error) {
      console.error('❌ Error handling relay upload completion:', error);
      socket.emit('relay-error', { 
        error: 'Failed to complete upload: ' + error.message 
      });
    }
  });
    socket.on('relay-file-request', async (data) => {
    try {
      const { code } = data;
      
      // Validate input
      if (!code) {
        socket.emit('relay-error', { 
          error: 'No transfer code provided' 
        });
        return;
      }
      
      console.log(`📥 Relay file request for code ${code}`);
      
      // Get files from memory storage
      const storedFiles = memoryStorage.getRelayFiles(code);
      
      if (!storedFiles || storedFiles.length === 0) {
        console.log(`❌ No files found for code ${code}`);
        socket.emit('relay-error', { 
          error: 'No files found for this code. Please check the code or ensure files were uploaded successfully.' 
        });
        return;
      }
      
      console.log(`📦 Found ${storedFiles.length} files for code ${code}`);
      
      // Send files one by one with error handling
      for (let i = 0; i < storedFiles.length; i++) {
        try {
          const fileData = storedFiles[i];
          
          if (!fileData || !fileData.name) {
            console.error(`Invalid file data at index ${i}`);
            continue;
          }
          
          console.log(`📤 Sending file ${i + 1}/${storedFiles.length}: ${fileData.name}`);
          
          socket.emit('relay-file-download', {
            fileData: fileData,
            fileIndex: i,
            totalFiles: storedFiles.length
          });
          
          // Small delay between files to prevent overwhelming the client
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (fileError) {
          console.error(`Error sending file ${i}:`, fileError);
          // Continue with other files
        }
      }
      
      // Send completion signal
      socket.emit('relay-download-complete', {
        code: code,
        totalFiles: storedFiles.length
      });
      
      console.log(`✅ All ${storedFiles.length} files sent for code ${code}`);
      
      // Clean up files after successful download
      setTimeout(() => {
        memoryStorage.cleanupRelayFiles(code);
        console.log(`🧹 Cleaned up files for code ${code}`);
      }, 5000); // 5 second delay to ensure client receives all data
      
    } catch (error) {
      console.error('❌ Error handling relay file request:', error);
      socket.emit('relay-error', { 
        error: 'Failed to retrieve files from server: ' + error.message 
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      // Clean up any active sessions for this socket
      await pool.query(
        'DELETE FROM transfer_sessions WHERE sender_socket_id = $1 OR receiver_socket_id = $1',
        [socket.id]
      );
      console.log('Client disconnected:', socket.id);
    } catch (error) {
      console.error('Error cleaning up after disconnect:', error);
    }  });
});

// Initialize database
const { setupDatabase } = require('./config/db');
setupDatabase().then(() => {
  console.log('Database initialized');
});

// Start server
const PORT = process.env.PORT || 4999;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Production)' : 'Local PostgreSQL'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (pool) {
      pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (pool) {
      pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = { app, io };
