// P2P File Transfer using WebRTC with Socket.IO signaling
import { io } from 'socket.io-client';
import ApiConfig from '../utils/apiConfig';

class P2PFileTransfer {
  constructor() {
    this.localConnection = null;
    this.remoteConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    this.onErrorCallback = null;
    this.transferCode = null;
    this.incomingFile = null;
    this.socket = null;
    this.signalingInterval = null;
    
    // Dynamic backend URL configuration
    this.backendUrl = ApiConfig.getSocketUrl();
    
    // STUN servers for NAT traversal
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ];
    
    // Add locally stored files for instant sharing
    this.selectedFiles = [];
    this.codeGenerationPromise = null;
    this.isWaitingForPeer = false;
  }  // Initialize Socket.IO connection
  initializeSocket() {
    if (!this.socket) {
      this.socket = io(this.backendUrl);
      
      this.socket.on('connect', () => {
        console.log('📡 Connected to signaling server');
      });
      
      this.socket.on('signal', async (data) => {
        await this.handleSignalingMessage(data);
      });
      
      this.socket.on('peer-joined', (data) => {
        console.log('👥 Peer joined:', data.peerId);
      });
      
      this.socket.on('peer-left', (data) => {
        console.log('👋 Peer left:', data.peerId);
      });
      
      this.socket.on('disconnect', () => {
        console.log('📡 Disconnected from signaling server');
      });
    }
    
    return this.socket;
  }
  // Initialize P2P connection as sender
  async initiateSender(transferCode) {
    try {
      this.isInitiator = true;
      this.transferCode = transferCode;
      
      console.log('🚀 Initiating P2P sender for code:', transferCode);
      
      // Initialize Socket.IO connection
      this.initializeSocket();
      this.socket.emit('join-transfer', transferCode);
      
      // Create peer connection
      this.localConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });
      
      // Create data channel for file transfer
      this.dataChannel = this.localConnection.createDataChannel('fileTransfer', {
        ordered: true,
        maxRetransmits: 3
      });
      
      this.setupDataChannelHandlers();
      this.setupConnectionHandlers();
      
      // Create offer
      const offer = await this.localConnection.createOffer();
      await this.localConnection.setLocalDescription(offer);
      
      // Send offer through signaling server
      await this.sendSignalingMessage(transferCode, 'offer', offer);
      
      // Start listening for answer
      this.startSignalingPolling(transferCode);
      
      return true;
      
    } catch (error) {
      console.error('Failed to initiate P2P sender:', error);
      throw error;
    }
  }
  // Initialize P2P connection as receiver
  async initiateReceiver(transferCode) {
    try {
      this.isInitiator = false;
      this.transferCode = transferCode;
      
      console.log('📥 Initiating P2P receiver for code:', transferCode);
      
      // Initialize Socket.IO connection
      this.initializeSocket();
      this.socket.emit('join-transfer', transferCode);
      
      // Create peer connection
      this.localConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });
      
      this.setupConnectionHandlers();
      
      // Listen for data channel
      this.localConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelHandlers();
        console.log('✅ Data channel received');
      };
      
      // Start listening for signaling messages
      this.startSignalingPolling(transferCode);
      
      return true;
      
    } catch (error) {
      console.error('Failed to initiate P2P receiver:', error);
      throw error;
    }
  }

  setupDataChannelHandlers() {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('✅ P2P Data channel opened');
    };
    
    this.dataChannel.onclose = () => {
      console.log('❌ P2P Data channel closed');
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('❌ P2P Data channel error:', error);
      if (this.onErrorCallback) this.onErrorCallback(error);
    };
    
    this.dataChannel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  setupConnectionHandlers() {
    this.localConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        await this.sendSignalingMessage(this.transferCode, 'ice-candidate', event.candidate);
      }
    };
    
    this.localConnection.onconnectionstatechange = () => {
      console.log('🔄 P2P Connection state:', this.localConnection.connectionState);
      
      if (this.localConnection.connectionState === 'connected') {
        console.log('✅ P2P connection established!');
      } else if (this.localConnection.connectionState === 'failed') {
        console.log('❌ P2P connection failed, falling back to server');
        if (this.onErrorCallback) this.onErrorCallback(new Error('P2P_CONNECTION_FAILED'));
      }
    };
  }
  // Send multiple files via P2P
  async sendFiles(files, onProgress) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('P2P connection not ready');
    }
    
    this.onProgressCallback = onProgress;
    
    console.log(`📤 Starting P2P transfer of ${files.length} files`);
    
    // Send files metadata first
    const filesMetadata = {
      type: 'files-metadata',
      totalFiles: files.length,
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    };
    
    this.dataChannel.send(JSON.stringify(filesMetadata));
      // Send each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Sending file ${i + 1}/${files.length}: ${file.name}`);
      
      // Add initial progress for file start
      if (this.onProgressCallback) {
        this.onProgressCallback({
          fileName: file.name,
          completed: false,
          index: i + 1,
          total: files.length,
          type: 'p2p',
          percentage: 0,
          overallPercentage: (i / files.length) * 100
        });
      }
      await this.sendSingleFile(file, i + 1, files.length);
    }
    
    // Send completion message
    this.dataChannel.send(JSON.stringify({ type: 'transfer-complete' }));
    
    if (this.onCompleteCallback) this.onCompleteCallback();
  }
  
  // Send single file via P2P
  async sendSingleFile(file, fileIndex, totalFiles) {
    // Larger chunk size for better performance with WebRTC
    const chunkSize = 131072; // 128KB chunks for optimal WebRTC performance
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    // Send file metadata
    const metadata = {
      type: 'file-start',
      fileIndex: fileIndex,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      totalChunks: totalChunks
    };
    
    this.dataChannel.send(JSON.stringify(metadata));
    
    // Send file in chunks
    let offset = 0;
    let chunkIndex = 0;
    let lastProgressUpdate = 0;
    const progressThrottleMs = 100; // Update UI at most every 100ms for performance
    
    // Advanced chunk reading - process multiple chunks in parallel
    const sendChunksParallel = async () => {
      const maxParallelChunks = 3; // Process up to 3 chunks in parallel
      const bufferThreshold = 16 * 1024 * 1024; // 16MB buffering threshold
      
      while (offset < file.size) {
        const tasks = [];
        const startOffset = offset;
        
        // Create batch of parallel chunk tasks
        for (let i = 0; i < maxParallelChunks && offset < file.size; i++) {
          const currentOffset = offset;
          const currentChunkIndex = chunkIndex;
          
          const chunkEnd = Math.min(currentOffset + chunkSize, file.size);
          const chunk = file.slice(currentOffset, chunkEnd);
          
          // Add chunk processing task
          tasks.push(
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              
              reader.onload = (e) => {
                const chunkData = {
                  type: 'file-chunk',
                  fileIndex: fileIndex,
                  chunkIndex: currentChunkIndex,
                  data: Array.from(new Uint8Array(e.target.result))
                };
                
                // Send chunk data
                this.dataChannel.send(JSON.stringify(chunkData));
                resolve();
              };
              
              reader.onerror = reject;
              reader.readAsArrayBuffer(chunk);
            })
          );
          
          offset += chunkSize;
          chunkIndex++;
        }
        
        // Wait for all chunks in this batch to be processed
        await Promise.all(tasks);
        
        // Update progress after each batch (throttled)
        const now = Date.now();
        if (now - lastProgressUpdate >= progressThrottleMs) {
          lastProgressUpdate = now;
          
          const fileProgress = Math.min((offset / file.size) * 100, 100);
          const overallProgress = ((fileIndex - 1) / totalFiles + (fileProgress / 100) / totalFiles) * 100;
          
          if (this.onProgressCallback) {
            this.onProgressCallback({
              fileName: file.name,
              completed: false,
              index: fileIndex,
              total: totalFiles,
              type: 'p2p',
              percentage: fileProgress,
              overallPercentage: overallProgress,
              speed: 'high-speed' // Indicates this is using the faster method
            });
          }
        }
        
        // Wait if buffer is getting too full (backpressure handling)
        if (this.dataChannel.bufferedAmount > bufferThreshold) {
          await new Promise(resolve => {
            const checkBuffer = () => {
              if (this.dataChannel.bufferedAmount < bufferThreshold / 2) {
                resolve();
              } else {
                setTimeout(checkBuffer, 10);
              }
            };
            checkBuffer();
          });
        }
      }
      
      // File transfer complete
      this.dataChannel.send(JSON.stringify({ 
        type: 'file-complete',
        fileIndex: fileIndex 
      }));
      
      // Final progress update
      if (this.onProgressCallback) {
        this.onProgressCallback({
          fileName: file.name,
          completed: false,
          index: fileIndex,
          total: totalFiles,
          type: 'p2p',
          percentage: 100,
          overallPercentage: ((fileIndex) / totalFiles) * 100
        });
      }
    };
    
    await sendChunksParallel();
  }
  // Handle incoming file data
  handleIncomingData(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'files-metadata':
          console.log(`📥 Receiving ${message.totalFiles} files via P2P`);
          this.incomingFiles = {
            totalFiles: message.totalFiles,
            files: message.files.map(f => ({
              ...f,
              receivedChunks: [],
              receivedBytes: 0,
              completed: false,
              lastProgressUpdate: 0
            })),
            completedFiles: 0
          };
          break;
          
        case 'file-start':
          console.log(`📥 Starting file ${message.fileIndex}/${this.incomingFiles.totalFiles}: ${message.name}`);
          if (this.incomingFiles && this.incomingFiles.files[message.fileIndex - 1]) {
            const file = this.incomingFiles.files[message.fileIndex - 1];
            file.receivedChunks = new Array(message.totalChunks);
            file.totalChunks = message.totalChunks;
            
            // Pre-allocate typed arrays for better performance
            if (file.size > 100 * 1024 * 1024) { // For files > 100MB
              // Use sparse array to save memory
              file.receivedChunks = {};
            }
          }
          break;
          
        case 'file-chunk':
          if (this.incomingFiles && this.incomingFiles.files[message.fileIndex - 1]) {
            const file = this.incomingFiles.files[message.fileIndex - 1];
            const chunkData = new Uint8Array(message.data);
            
            // Store chunk
            file.receivedChunks[message.chunkIndex] = chunkData;
            file.receivedBytes += chunkData.length;
            
            // Throttle progress updates for better performance
            const now = Date.now();
            const progressThrottleMs = 150; // Update UI every 150ms max
            
            if (now - file.lastProgressUpdate >= progressThrottleMs || 
                file.receivedBytes >= file.size) {
              file.lastProgressUpdate = now;
              
              // Report progress
              const fileProgress = Math.min((file.receivedBytes / file.size) * 100, 100);
              const overallProgress = ((this.incomingFiles.completedFiles + fileProgress / 100) / this.incomingFiles.totalFiles) * 100;
              
              if (this.onProgressCallback) {
                this.onProgressCallback({
                  fileName: file.name,
                  completed: false,
                  index: message.fileIndex,
                  total: this.incomingFiles.totalFiles,
                  type: 'p2p',
                  percentage: fileProgress,
                  overallPercentage: overallProgress,
                  received: file.receivedBytes,
                  total: file.size
                });
              }
            }
          }
          break;
          
        case 'file-complete':
          if (this.incomingFiles && this.incomingFiles.files[message.fileIndex - 1]) {
            const file = this.incomingFiles.files[message.fileIndex - 1];
            
            // Show final progress before download
            if (this.onProgressCallback) {
              this.onProgressCallback({
                fileName: file.name,
                completed: false,
                index: message.fileIndex,
                total: this.incomingFiles.totalFiles,
                type: 'p2p',
                percentage: 100,
                status: 'preparing-download'
              });
            }
            
            // Download the file
            this.downloadSingleFile(file, message.fileIndex);
            this.incomingFiles.completedFiles++;
            
            // Clear chunk data to free memory
            file.receivedChunks = null;
            
            // Report completion
            if (this.onProgressCallback) {
              this.onProgressCallback({
                fileName: file.name,
                completed: true,
                index: message.fileIndex,
                total: this.incomingFiles.totalFiles,
                type: 'p2p',
                percentage: 100
              });
            }
          }
          break;
          
        case 'transfer-complete':
          console.log('✅ P2P transfer completed successfully');
          if (this.onCompleteCallback) this.onCompleteCallback();
          break;
      }
    } catch (error) {
      console.error('Error handling P2P data:', error);
    }
  }

  // Download single file from received chunks
  downloadSingleFile(file, fileIndex) {
    console.log(`💾 Downloading file: ${file.name}`);
    
    // Combine all chunks
    const chunks = file.receivedChunks.filter(chunk => chunk !== undefined);
    const blob = new Blob(chunks, { type: file.type });
    
    // Download file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Downloaded: ${file.name}`);
  }
  // Signaling server communication via Socket.IO
  async sendSignalingMessage(transferCode, type, data) {
    try {
      if (!this.socket) {
        throw new Error('Socket not initialized');
      }
      
      console.log(`📡 Sending ${type} signal for transfer ${transferCode}`);
      
      this.socket.emit('signal', {
        transferCode,
        signal: { type, data },
        timestamp: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Signaling send error:', error);
        // Fallback to HTTP signaling
      try {
        const response = await fetch(`${this.backendUrl}/api/signaling`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferCode,
            type,
            data,
            timestamp: Date.now()
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP signaling failed: ${response.statusText}`);
        }
        
        return response.json();
      } catch (httpError) {
        console.error('HTTP signaling fallback failed:', httpError);
        throw httpError;
      }
    }
  }
  async getSignalingMessages(transferCode) {
    try {
      const response = await fetch(`${this.backendUrl}/api/signaling/${transferCode}`);
      if (response.ok) {
        return response.json();
      }
      return [];
    } catch (error) {
      console.error('Signaling get error:', error);
      return [];
    }
  }

  startSignalingPolling(transferCode) {
    // With Socket.IO, we don't need polling as we get real-time events
    // But keep this method for HTTP fallback
    if (!this.socket || !this.socket.connected) {
      console.log('📡 Socket not connected, using HTTP polling fallback');
      
      const pollInterval = setInterval(async () => {
        try {
          const messages = await this.getSignalingMessages(transferCode);
          
          for (const message of messages) {
            await this.handleSignalingMessage(message);
          }
        } catch (error) {
          console.error('Signaling polling error:', error);
        }
      }, 1000);      // Stop polling after 0 seconds if no connection (immediate fallback)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (this.localConnection && this.localConnection.connectionState !== 'connected') {
          console.log('❌ P2P connection timeout, falling back to server');
          if (this.onErrorCallback) this.onErrorCallback(new Error('P2P_TIMEOUT'));
        }
      }, 0); // 0 second timeout for immediate fallback
      
      // Store interval for cleanup
      this.signalingInterval = pollInterval;
    } else {      // With Socket.IO, set a connection timeout (set to 0 for immediate fallback)
      setTimeout(() => {
        if (this.localConnection && this.localConnection.connectionState !== 'connected') {
          console.log('❌ P2P connection timeout, falling back to server');
          if (this.onErrorCallback) this.onErrorCallback(new Error('P2P_TIMEOUT'));
        }
      }, 0); // 0 second timeout for immediate fallback
    }
  }

  async handleSignalingMessage(messageOrData) {
    try {
      // Handle both direct messages and Socket.IO data format
      const message = messageOrData.signal || messageOrData;
      
      switch (message.type) {
        case 'offer':
          console.log('📥 Received offer');
          await this.localConnection.setRemoteDescription(message.data);
          const answer = await this.localConnection.createAnswer();
          await this.localConnection.setLocalDescription(answer);
          await this.sendSignalingMessage(this.transferCode, 'answer', answer);
          break;
          
        case 'answer':
          console.log('📥 Received answer');
          await this.localConnection.setRemoteDescription(message.data);
          break;
          
        case 'ice-candidate':
          console.log('🧊 Received ICE candidate');
          await this.localConnection.addIceCandidate(message.data);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }

  // Check if P2P is supported
  static isSupported() {
    return !!(window.RTCPeerConnection && window.RTCDataChannel);
  }
  // Generate a code immediately without uploading files
  async generateSharingCode(files) {
    if (!files || files.length === 0) {
      throw new Error('No files selected');
    }
    
    // Store selected files locally
    this.selectedFiles = Array.from(files);
    
    console.log(`🔄 Generating instant sharing code for ${files.length} files...`);
    
    // Generate a code from the server without uploading files
    const fileMetadata = {
      fileNames: this.selectedFiles.map(f => f.name),
      fileSizes: this.selectedFiles.map(f => f.size),
      fileTypes: this.selectedFiles.map(f => f.type),
      instant: true // Flag to indicate this is an instant sharing request
    };
      try {
      // Ask server to generate a code without uploading files
      // Use upload-minimal endpoint for better reliability on Render.com
      const response = await fetch(`${this.backendUrl}/api/upload-minimal/p2p`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileMetadata)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate code: ${response.statusText}`);
      }
      
      const result = await response.json();
      const transferCode = result.downloadCode;
      
      if (!transferCode) {
        throw new Error('No transfer code received from server');
      }
      
      this.transferCode = transferCode;
      this.isWaitingForPeer = true;
      
      console.log(`✅ Instant sharing code generated: ${transferCode}`);
      
      // Return the code immediately
      return {
        success: true,
        downloadCode: transferCode,
        method: 'instant-p2p',
        message: 'Ready to share files instantly'
      };
    } catch (error) {
      console.error('Failed to generate sharing code:', error);
      throw error;
    }
  }
  
  // Start sharing the already selected files when peer connects
  async startSharing(onProgress) {
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      throw new Error('No files selected for sharing');
    }
    
    if (!this.transferCode) {
      throw new Error('No transfer code available');
    }
    
    console.log(`🚀 Starting instant P2P sharing with code: ${this.transferCode}`);
    
    try {
      // Initialize P2P connection as sender
      await this.initiateSender(this.transferCode);
      
      // Wait for connection with longer timeout for P2P establishment
      await this.waitForConnection(30000); // 30 second timeout
      
      if (this.dataChannel?.readyState === 'open') {
        console.log('✅ P2P connection established, sending files...');
        // Send the files over P2P
        await this.sendFiles(this.selectedFiles, onProgress);
        return true;
      } else {
        console.log('❌ Failed to establish P2P connection for sharing');
        throw new Error('P2P connection failed');
      }
    } catch (error) {
      console.error('Error starting instant sharing:', error);
      throw error;
    }
  }
    // Check if a peer is trying to connect for the given code
  async checkForPeer(code) {
    try {
      const response = await fetch(`${this.backendUrl}/api/download/p2p/check/${code}`);
      
      if (!response.ok) {
        return { available: false };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking for peer:', error);
      return { available: false };
    }
  }

  // Modified waitForConnection to be more responsive
  waitForConnection(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        if (this.localConnection.connectionState === 'connected') {
          resolve();
        } else if (this.dataChannel?.readyState === 'open') {
          resolve();
        } else if (this.localConnection.connectionState === 'failed') {
          reject(new Error('Connection failed'));
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 50); // Check more frequently (50ms)
        }
      };
      
      checkConnection();
    });
  }
  // Clean up connections
  cleanup() {
    if (this.signalingInterval) {
      clearInterval(this.signalingInterval);
      this.signalingInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.localConnection) {
      this.localConnection.close();
      this.localConnection = null;
    }
    
    console.log('🧹 P2P connection cleaned up');
  }
}

export default P2PFileTransfer;
