/**
 * Chunked File Upload Service
 * Handles large file uploads by breaking them into manageable chunks
 * Supports progress tracking, resumable uploads, and error recovery
 */

// Import health monitor
import healthMonitor from '../utils/healthMonitor';
import timeoutHandler from '../utils/timeoutHandler';

class ChunkedUploadService {  
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 
      (process.env.NODE_ENV === 'development' ? '/api/chunked-upload' : 'https://p2p-transfer-backend.onrender.com/api/chunked-upload');
    // Default chunk size, will be adjusted based on health monitor
    this.chunkSize = 10 * 1024 * 1024; // 10MB default
    this.maxRetries = 3;
    this.currentUploads = new Map(); // Track current upload sessions
    
    // Immediately adjust chunk size based on environment
    this.updateChunkSize();
  }
  
  /**
   * Update chunk size based on current health status
   */
  updateChunkSize() {
    this.chunkSize = healthMonitor.getRecommendedChunkSize();
    console.log(`📦 Set chunk size to: ${Math.round(this.chunkSize / 1024 / 1024)}MB based on system health`);
  }/**
   * All files now use chunked upload for consistent progress tracking
   * @param {File} file - The file to check
   * @returns {boolean} - Always true for all files
   */
  shouldUseChunkedUpload(file) {
    return true; // All files use chunked upload for progress tracking
  }

  /**
   * Initialize a new chunked upload session
   * @param {File} file - The file to upload
   * @param {string} [batchCode] - Optional batch code for multiple files
   * @returns {Promise<Object>} - Upload session information
   */
  async initializeUpload(file, batchCode = null) {
    try {
      console.log(`🔍 Initializing chunked upload for file: ${file.name} (${this.formatBytes(file.size)})`);
      
      const totalChunks = Math.ceil(file.size / this.chunkSize);
      
      const response = await fetch(`${this.baseUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks: totalChunks,
          batchCode: batchCode // Pass batch code if provided
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize upload');
      }
      
      const result = await response.json();
      
      // If the server suggests a different chunk size, use that
      if (result.chunkSize) {
        this.chunkSize = result.chunkSize;
      }
      
      // Store upload information
      const uploadInfo = {
        uploadId: result.uploadId,
        downloadCode: result.downloadCode,
        file: file,
        totalChunks: Math.ceil(file.size / this.chunkSize),
        uploadedChunks: 0,
        status: 'initialized',
        chunkSize: this.chunkSize,
        startTime: Date.now(),
        pauseRequested: false,
        cancelRequested: false,
      };
      
      this.currentUploads.set(result.uploadId, uploadInfo);
      
      return {
        success: true,
        uploadId: result.uploadId, 
        downloadCode: result.downloadCode
      };
    } catch (error) {
      console.error('Error initializing chunked upload:', error);
      throw error;
    }
  }

  /**
   * Initialize a batch upload for multiple files
   * @param {File[]} files - The files to upload
   * @returns {Promise<Object>} - Batch upload information
   */
  async initializeBatchUpload(files) {
    try {
      console.log(`🔍 Initializing batch upload for ${files.length} files`);
      
      const response = await fetch(`${this.baseUrl}/init-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileCount: files.length,
          fileNames: files.map(file => file.name),
          fileSizes: files.map(file => file.size),
          fileTypes: files.map(file => file.type)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize batch upload');
      }
      
      const result = await response.json();
      
      console.log(`📦 Batch upload initialized with shared code: ${result.downloadCode}`);
      
      return {
        success: true,
        batchId: result.batchId,
        downloadCode: result.downloadCode
      };
    } catch (error) {
      console.error('Error initializing batch upload:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files in chunks with a shared download code
   * @param {File[]} files - The files to upload
   * @param {Function} onProgress - Progress callback
   * @param {Function} onCompleted - Completion callback
   * @returns {Promise<Object>} - Upload result with shared download code
   */
  async uploadBatch(files, onProgress = null, onCompleted = null) {
    try {
      // Initialize batch upload to get shared download code
      const { downloadCode } = await this.initializeBatchUpload(files);
      
      const results = [];
      let totalProgress = 0;
      
      // Upload each file with the same batch code
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = i + 1;
        
        try {
          console.log(`🔄 Uploading file ${fileIndex}/${files.length} in batch: ${file.name}`);
          
          // Initialize upload with the shared batch code
          const { uploadId } = await this.initializeUpload(file, downloadCode);
          
          const uploadInfo = this.currentUploads.get(uploadId);
          
          // Start uploading chunks
          for (let chunkIndex = 0; chunkIndex < uploadInfo.totalChunks; chunkIndex++) {
            // Check if cancel requested
            if (uploadInfo.cancelRequested) {
              console.log(`❌ Upload ${uploadId} was cancelled`);
              return { success: false, cancelled: true };
            }
            
            // Check if pause requested
            while (uploadInfo.pauseRequested) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`⏸️ Upload ${uploadId} is paused`);
              
              if (uploadInfo.cancelRequested) {
                console.log(`❌ Upload ${uploadId} was cancelled while paused`);
                return { success: false, cancelled: true };
              }
            }
            
            // Calculate chunk boundaries
            const start = chunkIndex * uploadInfo.chunkSize;
            const end = Math.min(start + uploadInfo.chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            // Try to upload chunk with retries
            let retries = 0;
            let success = false;
            
            while (!success && retries < this.maxRetries) {
              try {
                const result = await this.uploadChunk(uploadId, chunk, chunkIndex, uploadInfo.totalChunks);
                success = true;
                uploadInfo.uploadedChunks++;
                
                // Update progress for this file
                if (onProgress) {
                  // Calculate overall progress across all files
                  const fileProgress = (uploadInfo.uploadedChunks / uploadInfo.totalChunks) * 100;
                  const fileWeight = file.size / files.reduce((sum, f) => sum + f.size, 0);
                  
                  // Update the total progress based on this file's contribution
                  totalProgress = files.reduce((sum, f, idx) => {
                    if (idx < i) {
                      // Completed files contribute 100% of their weight
                      return sum + (f.size / files.reduce((s, file) => s + file.size, 0)) * 100;
                    } else if (idx === i) {
                      // Current file contributes its progress percentage of its weight
                      return sum + fileWeight * fileProgress;
                    }
                    // Files not yet started contribute 0
                    return sum;
                  }, 0);
                  
                  const overallProgress = Math.min(Math.round(totalProgress), 99);
                  
                  onProgress({
                    fileName: file.name,
                    percentage: overallProgress,
                    uploadId: uploadId,
                    fileIndex: fileIndex,
                    totalFiles: files.length,
                    chunksUploaded: uploadInfo.uploadedChunks,
                    totalChunks: uploadInfo.totalChunks,
                    type: 'chunked'
                  });
                }
              } catch (error) {
                retries++;
                console.error(`Chunk upload error (retry ${retries}/${this.maxRetries}):`, error);
                
                if (retries < this.maxRetries) {
                  const delay = Math.pow(2, retries) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                  throw new Error(`Failed to upload chunk ${chunkIndex} after ${this.maxRetries} attempts`);
                }
              }
            }
          }
          
          // Complete this file's upload
          const completionResult = await this.completeUpload(uploadId);
          
          // Update upload status
          uploadInfo.status = 'completed';
          const duration = (Date.now() - uploadInfo.startTime) / 1000;
          
          console.log(`✅ Upload completed: ${file.name} (${this.formatBytes(file.size)}) in ${duration.toFixed(1)}s`);
          
          results.push({
            success: true,
            downloadCode: downloadCode,
            fileSize: file.size,
            fileName: file.name
          });
          
        } catch (error) {
          console.error(`❌ Failed to upload file ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }
      
      // All files uploaded, provide final progress update (100%)
      if (onProgress) {
        onProgress({
          percentage: 100,
          fileIndex: files.length,
          totalFiles: files.length,
          type: 'chunked',
          completed: true
        });
      }
      
      // Call completion callback if provided
      if (onCompleted) {
        onCompleted({
          fileCount: files.length,
          downloadCode: downloadCode,
          duration: (Date.now() - results[0].startTime) / 1000
        });
      }
      
      return {
        success: true,
        downloadCode: downloadCode,
        fileCount: files.length
      };
    } catch (error) {
      console.error('Error in batch upload:', error);
      throw error;
    }
  }

  /**
   * Upload a file in chunks with progress reporting
   * @param {File} file - The file to upload
   * @param {Function} onProgress - Progress callback
   * @param {Function} onCompleted - Completion callback
   * @returns {Promise<Object>} - Upload result with download code
   */
  async uploadFile(file, onProgress = null, onCompleted = null) {
    try {
      // Initialize upload
      const { uploadId, downloadCode } = await this.initializeUpload(file);
      
      const uploadInfo = this.currentUploads.get(uploadId);
      
      // Start uploading chunks
      for (let chunkIndex = 0; chunkIndex < uploadInfo.totalChunks; chunkIndex++) {
        // Check if cancel requested
        if (uploadInfo.cancelRequested) {
          console.log(`❌ Upload ${uploadId} was cancelled`);
          return { success: false, cancelled: true };
        }
        
        // Check if pause requested
        while (uploadInfo.pauseRequested) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`⏸️ Upload ${uploadId} is paused`);
          
          // Check if cancel was requested while paused
          if (uploadInfo.cancelRequested) {
            console.log(`❌ Upload ${uploadId} was cancelled while paused`);
            return { success: false, cancelled: true };
          }
        }
        
        // Calculate chunk boundaries
        const start = chunkIndex * uploadInfo.chunkSize;
        const end = Math.min(start + uploadInfo.chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        // Try to upload chunk with retries
        let retries = 0;
        let success = false;
        
        while (!success && retries < this.maxRetries) {
          try {
            const result = await this.uploadChunk(uploadId, chunk, chunkIndex, uploadInfo.totalChunks);
            success = true;
            uploadInfo.uploadedChunks++;
            
            // Update progress
            if (onProgress) {
              const progress = Math.min(Math.round((uploadInfo.uploadedChunks / uploadInfo.totalChunks) * 100), 99);
              onProgress({
                fileName: file.name,
                percentage: progress,
                uploadId: uploadId,
                chunksUploaded: uploadInfo.uploadedChunks,
                totalChunks: uploadInfo.totalChunks,
                type: 'chunked'
              });
            }
          } catch (error) {
            retries++;
            console.error(`Chunk upload error (retry ${retries}/${this.maxRetries}):`, error);
            
            // Wait before retry (exponential backoff)
            if (retries < this.maxRetries) {
              const delay = Math.pow(2, retries) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw new Error(`Failed to upload chunk ${chunkIndex} after ${this.maxRetries} attempts`);
            }
          }
        }      }
      
      // All chunks uploaded, now trigger server completion
      console.log(`🔄 All chunks uploaded, triggering server completion for: ${file.name}`);
      const completionResult = await this.completeUpload(uploadId);
      
      // Update upload status
      uploadInfo.status = 'completed';
      const duration = (Date.now() - uploadInfo.startTime) / 1000; // in seconds
      
      console.log(`✅ Chunked upload completed: ${file.name} (${this.formatBytes(file.size)}) in ${duration.toFixed(1)}s`);
      
      // Final progress update (100%)
      if (onProgress) {
        onProgress({
          fileName: file.name,
          percentage: 100,
          uploadId: uploadId,
          chunksUploaded: uploadInfo.totalChunks,
          totalChunks: uploadInfo.totalChunks,
          type: 'chunked',
          completed: true
        });
      }
      
      // Call completion callback if provided
      if (onCompleted) {
        onCompleted({
          fileName: file.name,
          fileSize: file.size,
          downloadCode: downloadCode,
          uploadId: uploadId,
          duration: duration
        });
      }
      
      return {
        success: true,
        downloadCode: downloadCode,
        fileSize: file.size,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error in chunked upload:', error);
      throw error;
    }
  }
  /**
   * Upload a single chunk to the server
   * @param {string} uploadId - Upload session ID
   * @param {Blob} chunk - The chunk data to upload
   * @param {number} chunkIndex - Index of the chunk
   * @param {number} totalChunks - Total number of chunks
   * @returns {Promise<Object>} - Chunk upload result
   */  async uploadChunk(uploadId, chunk, chunkIndex, totalChunks) {
    const formData = new FormData();
    formData.append('chunk', chunk, 'chunk');
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
    
    try {
      const response = await fetch(`${this.baseUrl}/chunk`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Pass uploadId and chunkIndex as headers for multer configuration
        headers: {
          'Connection': 'keep-alive',
          'upload-id': uploadId,
          'chunk-index': chunkIndex.toString()
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Chunk upload failed with status: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Chunk upload timed out - please retry');
      } else if (error.message.includes('ECONNRESET') || error.message.includes('fetch')) {
        throw new Error('Connection reset during chunk upload - please retry');
      }
      
      throw error;
    }
  }
  /**
   * Complete the upload by triggering server-side file assembly
   * @param {string} uploadId - Upload session ID
   * @returns {Promise<Object>} - Completion result
   */
  async completeUpload(uploadId) {
    const response = await fetch(`${this.baseUrl}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload completion failed with status: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Wait for the server to complete processing the uploaded chunks
   * @param {string} uploadId - Upload session ID
   * @returns {Promise<Object>} - Final upload status
   */
  async waitForCompletion(uploadId) {
    const maxAttempts = 180; // Allow up to 3 minutes for completion
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/status/${uploadId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // If upload is complete or failed, return result
        if (result.isComplete || result.status === 'completed') {
          return result;
        } else if (result.status === 'failed') {
          throw new Error('Upload processing failed on the server');
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error checking upload completion:', error);
        
        // For errors, wait a bit longer before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    throw new Error('Timed out waiting for upload to complete');
  }

  /**
   * Pause an in-progress upload
   * @param {string} uploadId - Upload ID to pause
   * @returns {boolean} - Success status
   */
  pauseUpload(uploadId) {
    const uploadInfo = this.currentUploads.get(uploadId);
    
    if (!uploadInfo) {
      return false;
    }
    
    uploadInfo.pauseRequested = true;
    return true;
  }

  /**
   * Resume a paused upload
   * @param {string} uploadId - Upload ID to resume
   * @returns {boolean} - Success status
   */
  resumeUpload(uploadId) {
    const uploadInfo = this.currentUploads.get(uploadId);
    
    if (!uploadInfo) {
      return false;
    }
    
    uploadInfo.pauseRequested = false;
    return true;
  }

  /**
   * Cancel an in-progress upload
   * @param {string} uploadId - Upload ID to cancel
   * @returns {boolean} - Success status
   */
  cancelUpload(uploadId) {
    const uploadInfo = this.currentUploads.get(uploadId);
    
    if (!uploadInfo) {
      return false;
    }
    
    uploadInfo.cancelRequested = true;
    return true;
  }

  /**
   * Format bytes into human-readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ChunkedUploadService;
