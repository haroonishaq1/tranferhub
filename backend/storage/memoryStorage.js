// Simple in-memory storage for development without PostgreSQL
class MemoryStorage {
  constructor() {
    this.transferSessions = new Map();
    this.users = new Map();
    this.transferStats = new Map();
    this.relayFiles = new Map(); // For storing files during server relay
  }

  // Transfer session methods
  createTransferSession(code, senderSocketId) {
    const session = {
      id: Date.now(),
      code,
      sender_socket_id: senderSocketId,
      receiver_socket_id: null,
      completed: false,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    this.transferSessions.set(code, session);
    
    // Auto-expire after 10 minutes
    setTimeout(() => {
      this.transferSessions.delete(code);
    }, 10 * 60 * 1000);
    
    return session;
  }

  getTransferSession(code) {
    const session = this.transferSessions.get(code);
    if (!session) return null;
    
    // Check if expired
    if (new Date() > session.expires_at) {
      this.transferSessions.delete(code);
      return null;
    }
    
    return session;
  }

  updateTransferSession(code, updates) {
    const session = this.transferSessions.get(code);
    if (session) {
      Object.assign(session, updates);
      this.transferSessions.set(code, session);
    }
    return session;
  }

  deleteTransferSession(code) {
    return this.transferSessions.delete(code);
  }

  // User methods (for future authentication features)
  createUser(username, email, hashedPassword) {
    const user = {
      id: Date.now(),
      username,
      email,
      password: hashedPassword,
      created_at: new Date()
    };
    
    this.users.set(email, user);
    return user;
  }

  getUserByEmail(email) {
    return this.users.get(email);
  }

  getUserByUsername(username) {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  // Transfer stats methods
  addTransferStat(code, fileCount, totalSize, senderId = null) {
    const stat = {
      id: Date.now(),
      transfer_code: code,
      file_count: fileCount,
      total_size: totalSize,
      sender_id: senderId,
      completed_at: new Date(),
      created_at: new Date()
    };
    
    this.transferStats.set(Date.now().toString(), stat);
    return stat;
  }

  // Relay file storage methods for cross-device transfers
  storeRelayFile(code, fileIndex, fileData) {
    if (!this.relayFiles.has(code)) {
      this.relayFiles.set(code, {
        files: [],
        uploadComplete: false,
        totalFiles: 0,
        createdAt: new Date()
      });
    }
    
    const relayData = this.relayFiles.get(code);
    relayData.files[fileIndex] = fileData;
    
    // Auto-expire after 1 hour
    setTimeout(() => {
      this.relayFiles.delete(code);
    }, 60 * 60 * 1000);
  }
  
  markUploadComplete(code, totalFiles) {
    if (this.relayFiles.has(code)) {
      const relayData = this.relayFiles.get(code);
      relayData.uploadComplete = true;
      relayData.totalFiles = totalFiles;
    }
  }
  
  getRelayFiles(code) {
    const relayData = this.relayFiles.get(code);
    if (!relayData || !relayData.uploadComplete) {
      return null;
    }
    
    // Return files in correct order
    const files = [];
    for (let i = 0; i < relayData.totalFiles; i++) {
      if (relayData.files[i]) {
        files.push(relayData.files[i]);
      }
    }
    
    return files;
  }
  
  cleanupRelayFiles(code) {
    return this.relayFiles.delete(code);
  }

  // Cleanup expired sessions
  cleanup() {
    const now = new Date();
    
    // Cleanup transfer sessions
    for (const [code, session] of this.transferSessions.entries()) {
      if (now > session.expires_at) {
        this.transferSessions.delete(code);
      }
    }
    
    // Cleanup relay files older than 1 hour
    for (const [code, relayData] of this.relayFiles.entries()) {
      const hourAgo = new Date(now - 60 * 60 * 1000);
      if (relayData.createdAt < hourAgo) {
        this.relayFiles.delete(code);
      }
    }
  }
}

// Create a singleton instance
const memoryStorage = new MemoryStorage();

// Cleanup expired sessions every minute
setInterval(() => {
  memoryStorage.cleanup();
}, 60 * 1000);

module.exports = memoryStorage;
