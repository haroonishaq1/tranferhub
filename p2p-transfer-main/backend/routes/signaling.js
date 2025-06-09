const express = require('express');
const router = express.Router();

// In-memory storage for signaling messages (use Redis in production)
const signalingMessages = new Map();
const connectedPeers = new Map(); // Store socket connections by transfer code

// Socket.IO signaling handler
function initializeSignaling(io) {
  io.on('connection', (socket) => {
    console.log(`📡 Peer connected: ${socket.id}`);
    
    socket.on('join-transfer', (transferCode) => {
      console.log(`👥 Peer ${socket.id} joining transfer: ${transferCode}`);
      socket.join(transferCode);
      
      if (!connectedPeers.has(transferCode)) {
        connectedPeers.set(transferCode, new Set());
      }
      connectedPeers.get(transferCode).add(socket.id);
      
      // Notify other peers in the room
      socket.to(transferCode).emit('peer-joined', { peerId: socket.id });
    });
    
    socket.on('signal', (data) => {
      const { transferCode, targetPeer, signal } = data;
      console.log(`📡 Relaying signal for ${transferCode} to ${targetPeer}`);
      
      if (targetPeer) {
        // Send to specific peer
        socket.to(targetPeer).emit('signal', {
          signal,
          fromPeer: socket.id,
          transferCode
        });
      } else {
        // Broadcast to room
        socket.to(transferCode).emit('signal', {
          signal,
          fromPeer: socket.id,
          transferCode
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`📡 Peer disconnected: ${socket.id}`);
      
      // Remove from all transfer rooms
      for (const [transferCode, peers] of connectedPeers.entries()) {
        if (peers.has(socket.id)) {
          peers.delete(socket.id);
          socket.to(transferCode).emit('peer-left', { peerId: socket.id });
          
          if (peers.size === 0) {
            connectedPeers.delete(transferCode);
          }
        }
      }
    });
  });
}

// Store signaling message (HTTP endpoint for fallback)
router.post('/', async (req, res) => {
  try {
    const { transferCode, type, data, timestamp } = req.body;
    
    if (!transferCode || !type) {
      return res.status(400).json({ error: 'Transfer code and type are required' });
    }
    
    if (!signalingMessages.has(transferCode)) {
      signalingMessages.set(transferCode, []);
    }
    
    const messages = signalingMessages.get(transferCode);
    messages.push({
      type,
      data,
      timestamp: timestamp || Date.now()
    });
    
    // Keep only recent messages (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    signalingMessages.set(transferCode, 
      messages.filter(msg => msg.timestamp > fiveMinutesAgo)
    );
    
    console.log(`📡 Signaling message stored for ${transferCode}: ${type}`);
    res.json({ success: true, messageCount: messages.length });
    
  } catch (error) {
    console.error('Signaling error:', error);
    res.status(500).json({ error: 'Signaling failed' });
  }
});

// Get signaling messages (HTTP endpoint for fallback)
router.get('/:transferCode', async (req, res) => {
  try {
    const { transferCode } = req.params;
    const messages = signalingMessages.get(transferCode) || [];
    
    // Return messages but don't clear them immediately
    res.json(messages);
    
    // Clear messages after retrieval to prevent duplicates
    signalingMessages.delete(transferCode);
    
  } catch (error) {
    console.error('Signaling retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve signaling messages' });
  }
});

// Get peer count for transfer code
router.get('/peers/:transferCode', async (req, res) => {
  try {
    const { transferCode } = req.params;
    const peers = connectedPeers.get(transferCode);
    const peerCount = peers ? peers.size : 0;
    
    res.json({
      transferCode,
      peerCount,
      hasConnectedPeers: peerCount > 0
    });
    
  } catch (error) {
    console.error('Peer count error:', error);
    res.status(500).json({ error: 'Failed to get peer count' });
  }
});

// Get signaling status (for debugging)
router.get('/status/:transferCode', async (req, res) => {
  try {
    const { transferCode } = req.params;
    const messages = signalingMessages.get(transferCode) || [];
    const peers = connectedPeers.get(transferCode);
    
    res.json({
      transferCode,
      messageCount: messages.length,
      peerCount: peers ? peers.size : 0,
      messages: messages.map(msg => ({ type: msg.type, timestamp: msg.timestamp }))
    });
    
  } catch (error) {
    console.error('Signaling status error:', error);
    res.status(500).json({ error: 'Failed to get signaling status' });
  }
});

// Clean up old signaling data (run periodically)
const cleanupInterval = setInterval(() => {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  let cleanedCodes = 0;
  
  for (const [code, messages] of signalingMessages.entries()) {
    const recentMessages = messages.filter(msg => msg.timestamp > tenMinutesAgo);
    
    if (recentMessages.length === 0) {
      signalingMessages.delete(code);
      cleanedCodes++;
    } else {
      signalingMessages.set(code, recentMessages);
    }
  }
  
  if (cleanedCodes > 0) {
    console.log(`🧹 Cleaned up ${cleanedCodes} old signaling codes`);
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
});

process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
});

// Export both router and initialization function
module.exports = router;
module.exports.initializeSignaling = initializeSignaling;
