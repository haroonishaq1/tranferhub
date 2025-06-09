const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const pool = require('../config/database');

const router = express.Router();

// Store active upload sessions in memory
const uploadSessions = new Map();
// Store batch uploads in memory
const batchUploads = new Map();

// Configure multer for disk storage of chunks
const chunksStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get uploadId from query params or headers as fallback
    const uploadId = req.query.uploadId || req.headers['upload-id'] || 'temp';
    const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
    fs.ensureDirSync(chunksDir);
    cb(null, chunksDir);
  },
  filename: function (req, file, cb) {
    // Get chunkIndex from query params or headers as fallback
    const chunkIndex = req.query.chunkIndex || req.headers['chunk-index'] || '0000';
    cb(null, `chunk-${chunkIndex.toString().padStart(4, '0')}`);
  }
});

const chunkUpload = multer({
  storage: chunksStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Increase to 500MB per chunk for large files
    fieldSize: 100 * 1024 * 1024, // 100MB for form fields
    fields: 10,
    files: 1
  }
});

// Generate 6-digit code
function generateDownloadCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if code exists in database
async function isCodeUnique(code) {
  const result = await pool.query(
    'SELECT download_code FROM files WHERE download_code = $1',
    [code]
  );
  return result.rows.length === 0;
}

// Generate a unique download code
async function generateUniqueCode() {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = generateDownloadCode();
    isUnique = await isCodeUnique(code);
  }
  
  return code;
}

// Initialize a batch upload (multiple files with single download code)
router.post('/init-batch', async (req, res) => {
  try {
    const { fileCount, fileNames, fileSizes, fileTypes } = req.body;
    
    if (!fileCount || !fileNames || !fileSizes || !fileTypes) {
      return res.status(400).json({ error: 'Missing required fields for batch upload' });
    }
    
    // Generate unique batch ID
    const batchId = crypto.randomUUID();
    
    // Generate unique download code for the entire batch
    const downloadCode = await generateUniqueCode();
    
    // Store batch info
    batchUploads.set(batchId, {
      downloadCode,
      fileCount,
      fileNames,
      fileSizes,
      fileTypes,
      startTime: Date.now(),
      completedFiles: 0,
      uploadIds: []
    });
    
    console.log(`📋 Batch upload initialized: ${fileCount} files with code ${downloadCode}`);
    
    res.json({
      success: true,
      batchId,
      downloadCode,
      fileCount
    });
    
  } catch (error) {
    console.error('Error initializing batch upload:', error);
    res.status(500).json({ error: 'Failed to initialize batch upload' });
  }
});

// Initialize a new chunked upload
router.post('/init', async (req, res) => {
  try {
    const { fileName, fileSize, totalChunks, batchCode } = req.body;
    
    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate unique upload ID
    const uploadId = crypto.randomUUID();
    
    // Determine download code
    let downloadCode;
    
    if (batchCode) {
      // Use the provided batch code
      downloadCode = batchCode;
      
      // Find the corresponding batch and add this upload ID
      for (const [batchId, batchInfo] of batchUploads.entries()) {
        if (batchInfo.downloadCode === batchCode) {
          batchInfo.uploadIds.push(uploadId);
          break;
        }
      }
    } else {
      // Generate a new unique code for this file
      downloadCode = await generateUniqueCode();
    }
    
    // Create directory for chunks
    const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
    fs.ensureDirSync(chunksDir);
    
    // Store upload session info in memory
    uploadSessions.set(uploadId, {
      downloadCode,
      fileName,
      fileSize,
      totalChunks,
      chunksReceived: 0,
      startTime: Date.now(),
      batchUpload: !!batchCode
    });
    
    console.log(`📋 Chunked upload initialized: ${fileName} (${Math.round(fileSize/1024/1024)}MB) - Code: ${downloadCode}`);
    
    res.json({ 
      success: true,
      uploadId,
      downloadCode,
      chunkSize: 100 * 1024 * 1024 // 100MB chunks
    });
  } catch (error) {
    console.error('Error initializing chunked upload:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Upload a chunk
router.post('/chunk', (req, res, next) => {
  // Set a longer timeout for chunk uploads
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  
  // Extract uploadId and chunkIndex from form data and set as query params
  // This is a workaround since multer needs these values before body parsing
  const uploadId = req.headers['upload-id'] || req.query.uploadId;
  const chunkIndex = req.headers['chunk-index'] || req.query.chunkIndex;
  
  if (!uploadId) {
    return res.status(400).json({ error: 'Missing uploadId in headers or query' });
  }
  
  if (chunkIndex === undefined) {
    return res.status(400).json({ error: 'Missing chunkIndex in headers or query' });
  }
  
  // Set query params for multer to use
  req.query.uploadId = uploadId;
  req.query.chunkIndex = chunkIndex;
  
  chunkUpload.single('chunk')(req, res, next);
}, async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks } = req.body;
    
    if (!uploadId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({ error: 'Missing required fields in body' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No chunk data received' });
    }
    
    const session = uploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    session.chunksReceived++;
    
    console.log(`🧩 Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} received for ${session.fileName} (${Math.round(req.file.size/1024/1024)}MB)`);
    
    res.json({ 
      success: true,
      chunkIndex: parseInt(chunkIndex),
      chunksReceived: session.chunksReceived,
      totalChunks: parseInt(totalChunks)
    });
    
  } catch (error) {
    console.error('Error uploading chunk:', error);
    
    // More specific error handling
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Chunk size too large' });
    } else if (error.code === 'ECONNRESET') {
      return res.status(500).json({ error: 'Connection reset - please retry this chunk' });
    }
    
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Complete the upload and assemble the file
router.post('/complete', async (req, res) => {
  try {
    const { uploadId, fileName, fileSize } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId' });
    }
    
    const session = uploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    console.log(`📋 Assembling file: ${session.fileName} from ${session.chunksReceived} chunks...`);
    
    const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
    const timestamp = Date.now();
    const serverFileName = `${timestamp}-${crypto.randomBytes(8).toString('hex')}-${session.fileName}`;
    const finalFilePath = path.join(__dirname, '..', 'uploads', serverFileName);
    
    // Get all chunk files and sort them
    const chunkFiles = await fs.readdir(chunksDir);
    chunkFiles.sort();
    
    // Assemble the file
    const writeStream = fs.createWriteStream(finalFilePath);
    
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(chunksDir, chunkFile);
      const chunkData = await fs.readFile(chunkPath);
      await new Promise((resolve, reject) => {
        writeStream.write(chunkData, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
    
    // Close the write stream
    await new Promise((resolve, reject) => {
      writeStream.end((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 168);
    
    // Check if this is part of a batch upload
    if (session.batchUpload) {
      console.log(`🔄 Part of batch upload with code: ${session.downloadCode}`);
      
      // Find the corresponding batch
      let batchId = null;
      let batchInfo = null;
      
      for (const [id, info] of batchUploads.entries()) {
        if (info.downloadCode === session.downloadCode) {
          batchId = id;
          batchInfo = info;
          break;
        }
      }
      
      if (batchInfo) {
        // Update the completed file count
        batchInfo.completedFiles++;
        
        // Check if we have all files from this batch
        if (batchInfo.completedFiles === batchInfo.fileCount) {
          console.log(`✅ All ${batchInfo.fileCount} files in batch completed with code: ${session.downloadCode}`);
          
          // Get all uploads from this batch
          const uploadIds = batchInfo.uploadIds;
          const fileRecords = [];
          
          // Collect the file data from each upload session
          for (const uploadId of uploadIds) {
            // Session might be deleted already if files were completed asynchronously
            const uploadSession = uploadSessions.get(uploadId);
            if (!uploadSession) continue;
            
            // Find corresponding file path in uploads folder
            const files = await fs.readdir(path.join(__dirname, '..', 'uploads'));
            for (const file of files) {
              if (file.includes(uploadSession.fileName)) {
                fileRecords.push({
                  name: uploadSession.fileName,
                  path: path.join(__dirname, '..', 'uploads', file),
                  size: uploadSession.fileSize.toString(),
                  type: 'application/octet-stream',
                  serverFileName: file
                });
              }
            }          }
            // Store batch in database (multiple files with same download code)
          await pool.query(
            `INSERT INTO files (download_code, file_names, file_paths, file_sizes, file_types, expires_at, upload_status, server_file_names, created_at, ip_address, user_agent) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
            [
              session.downloadCode,
              fileRecords.map(f => f.name),
              fileRecords.map(f => f.path),
              fileRecords.map(f => f.size),
              fileRecords.map(f => f.type),
              expiryDate,
              'completed',
              fileRecords.map(f => f.serverFileName),
              req.ip || '127.0.0.1',
              req.get('User-Agent') || 'Unknown'
            ]
          );
          
          // Clean up batch upload tracking
          batchUploads.delete(batchId);
          
          console.log(`✅ Batch upload completed and saved to database with code: ${session.downloadCode}`);
        }
      } else {
        console.log(`⚠️ Batch info not found for download code: ${session.downloadCode}`);
      }
    } else {      // Single file upload - store in database
      await pool.query(
        `INSERT INTO files (download_code, file_names, file_paths, file_sizes, file_types, expires_at, upload_status, server_file_names, created_at, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
        [
          session.downloadCode,
          [session.fileName],
          [finalFilePath],
          [session.fileSize.toString()],
          ['application/octet-stream'],
          expiryDate,
          'completed',
          [serverFileName],
          req.ip || '127.0.0.1',
          req.get('User-Agent') || 'Unknown'
        ]
      );
      
      console.log(`✅ Single file upload completed and saved to database with code: ${session.downloadCode}`);
    }
    
    // Clean up chunks directory
    try {
      await fs.remove(chunksDir);
      console.log(`🧹 Cleaned up chunks directory for ${uploadId}`);
    } catch (cleanupError) { 
      console.error('Error cleaning up chunks:', cleanupError);
    }
    
    // Clean up session
    uploadSessions.delete(uploadId);
    
    const uploadTime = Date.now() - session.startTime;
    console.log(`⚡ Upload completed in ${Math.round(uploadTime/1000)}s - Code: ${session.downloadCode}`);
    
    res.json({
      success: true,
      downloadCode: session.downloadCode,
      fileName: session.fileName,
      fileSize: session.fileSize,
      uploadTime: uploadTime,
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error completing upload:', error);
    
    // Clean up on error
    try {
      const session = uploadSessions.get(req.body.uploadId);
      if (session) {
        const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', req.body.uploadId);
        await fs.remove(chunksDir);
        uploadSessions.delete(req.body.uploadId);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

// Get upload status
router.get('/status/:uploadId', (req, res) => {
  try {
    const { uploadId } = req.params;
    const session = uploadSessions.get(uploadId);
    
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    res.json({
      success: true,
      uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      chunksReceived: session.chunksReceived,
      downloadCode: session.downloadCode,
      progress: Math.round((session.chunksReceived / session.totalChunks) * 100),
      batchUpload: session.batchUpload
    });
    
  } catch (error) {
    console.error('Error getting upload status:', error);
    res.status(500).json({ error: 'Failed to get upload status' });
  }
});

// Cancel upload
router.delete('/cancel/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const session = uploadSessions.get(uploadId);
    
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Clean up chunks directory
    const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
    try {
      await fs.remove(chunksDir);
      console.log(`🗑️ Cancelled and cleaned up upload: ${session.fileName}`);
    } catch (cleanupError) {
      console.error('Error cleaning up cancelled upload:', cleanupError);
    }
    
    // Remove from session
    uploadSessions.delete(uploadId);
    
    res.json({
      success: true,
      message: 'Upload cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling upload:', error);
    res.status(500).json({ error: 'Failed to cancel upload' });
  }
});

// Get batch status
router.get('/batch-status/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const batchInfo = batchUploads.get(batchId);
    
    if (!batchInfo) {
      return res.status(404).json({ error: 'Batch upload not found' });
    }
    
    res.json({
      success: true,
      batchId,
      downloadCode: batchInfo.downloadCode,
      fileCount: batchInfo.fileCount,
      completedFiles: batchInfo.completedFiles,
      progress: Math.round((batchInfo.completedFiles / batchInfo.fileCount) * 100),
      fileNames: batchInfo.fileNames
    });
    
  } catch (error) {
    console.error('Error getting batch status:', error);
    res.status(500).json({ error: 'Failed to get batch status' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    activeSessions: uploadSessions.size,
    activeBatches: batchUploads.size,
    timestamp: new Date().toISOString()
  });
});

// Detailed monitoring endpoint for batch uploads
router.get('/monitor', (req, res) => {
  try {
    const batches = [];
    const sessions = [];
    
    // Get all active batch uploads
    for (const [batchId, batchInfo] of batchUploads.entries()) {
      const duration = Date.now() - batchInfo.startTime;
      batches.push({
        batchId,
        downloadCode: batchInfo.downloadCode,
        fileCount: batchInfo.fileCount,
        completedFiles: batchInfo.completedFiles,
        progress: Math.round((batchInfo.completedFiles / batchInfo.fileCount) * 100),
        fileNames: batchInfo.fileNames,
        startTime: new Date(batchInfo.startTime).toISOString(),
        duration: Math.round(duration / 1000), // seconds
        uploadIds: batchInfo.uploadIds
      });
    }
    
    // Get all active upload sessions
    for (const [uploadId, session] of uploadSessions.entries()) {
      const duration = Date.now() - session.startTime;
      sessions.push({
        uploadId,
        downloadCode: session.downloadCode,
        fileName: session.fileName,
        fileSize: Math.round(session.fileSize / 1024 / 1024), // MB
        totalChunks: session.totalChunks,
        chunksReceived: session.chunksReceived,
        progress: Math.round((session.chunksReceived / session.totalChunks) * 100),
        startTime: new Date(session.startTime).toISOString(),
        duration: Math.round(duration / 1000), // seconds
        batchUpload: session.batchUpload
      });
    }
    
    res.json({
      success: true,
      summary: {
        activeBatches: batchUploads.size,
        activeSessions: uploadSessions.size,
        timestamp: new Date().toISOString()
      },
      batches,
      sessions
    });
    
  } catch (error) {
    console.error('Error getting monitor data:', error);
    res.status(500).json({ error: 'Failed to get monitor data' });
  }
});

// Clean up expired sessions (run periodically)
setInterval(() => {
  const now = Date.now();
  const sessionTimeout = 60 * 60 * 1000; // 1 hour
  
  for (const [uploadId, session] of uploadSessions.entries()) {
    if (now - session.startTime > sessionTimeout) {
      console.log(`🧹 Cleaning up expired session: ${uploadId}`);
      
      // Clean up chunks directory
      const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
      fs.remove(chunksDir).catch(error => {
        console.error('Error cleaning up expired chunks:', error);
      });
      
      uploadSessions.delete(uploadId);
    }
  }
  
  // Clean up expired batch uploads
  for (const [batchId, batchInfo] of batchUploads.entries()) {
    if (now - batchInfo.startTime > sessionTimeout) {
      console.log(`🧹 Cleaning up expired batch: ${batchId}`);
      batchUploads.delete(batchId);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

module.exports = router;
