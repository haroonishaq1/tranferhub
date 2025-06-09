// Simple in-memory storage for development without PostgreSQL
class MemoryStorage {
  constructor() {
    this.transferSessions = new Map();
    this.users = new Map();
    this.transferStats = new Map();
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

  // Cleanup expired sessions
  cleanup() {
    const now = new Date();
    for (const [code, session] of this.transferSessions.entries()) {
      if (now > session.expires_at) {
        this.transferSessions.delete(code);
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
