const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const QRCode = require('qrcode');

// Generate a unique 6-digit code for file transfer
router.post('/generate-code', async (req, res) => {
  try {
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try to store in database first, fallback to memory storage
    let session;
    try {
      const result = await req.db.query(
        'INSERT INTO transfer_sessions (code, sender_socket_id, created_at, expires_at) VALUES ($1, $2, NOW(), NOW() + INTERVAL \'10 minutes\') RETURNING *',
        [code, req.body.socketId]
      );
      session = result.rows[0];
    } catch (dbError) {
      console.log('Database not available, using memory storage');
      session = req.memoryStorage.createTransferSession(code, req.body.socketId);
    }

    // Return the code to the client
    res.status(200).json({ 
      success: true, 
      code,
      expiresAt: session.expires_at 
    });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ success: false, message: 'Failed to generate code' });
  }
});

// Generate QR code for the transfer code
router.get('/generate-qr/:code', async (req, res) => {
  try {
    const { code } = req.params;
      // Verify the code exists in our database or memory storage
    let session;
    try {
      const result = await req.db.query(
        'SELECT * FROM transfer_sessions WHERE code = $1 AND expires_at > NOW()',
        [code]
      );
      session = result.rows[0];
    } catch (dbError) {
      console.log('Database not available, using memory storage');
      session = req.memoryStorage.getTransferSession(code);
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid or expired code' });
    }
    
    // Generate QR code with the site URL and code
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const transferUrl = `${baseUrl}/receive/${code}`;
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(transferUrl);
    
    res.status(200).json({ 
      success: true, 
      qrCode: qrCodeDataUrl,
      transferUrl 
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
});

// Verify if a code is valid
router.get('/verify-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Check if code exists and is not expired
    let session;
    try {
      const result = await req.db.query(
        'SELECT * FROM transfer_sessions WHERE code = $1 AND expires_at > NOW()',
        [code]
      );
      session = result.rows[0];
    } catch (dbError) {
      console.log('Database not available, using memory storage');
      session = req.memoryStorage.getTransferSession(code);
    }
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        valid: false, 
        message: 'Invalid or expired code' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      valid: true,
      senderSocketId: session.sender_socket_id
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

// Log successful transfer (optional - for analytics)
router.post('/log-transfer', async (req, res) => {
  try {
    const { code, fileCount, totalSize, userId } = req.body;
      // Log the transfer stats
    try {
      await req.db.query(
        'INSERT INTO transfer_stats (transfer_code, file_count, total_size, sender_id, completed_at) VALUES ($1, $2, $3, $4, NOW())',
        [code, fileCount, totalSize, userId || null]
      );
      
      // Mark the transfer session as completed
      await req.db.query(
        'UPDATE transfer_sessions SET completed = TRUE WHERE code = $1',
        [code]
      );
    } catch (dbError) {
      console.log('Database not available, using memory storage');
      req.memoryStorage.addTransferStat(code, fileCount, totalSize, userId);
      req.memoryStorage.updateTransferSession(code, { completed: true });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging transfer:', error);
    res.status(500).json({ success: false, message: 'Failed to log transfer' });
  }
});

module.exports = router;
