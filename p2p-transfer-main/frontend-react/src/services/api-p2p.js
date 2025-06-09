import P2PFileTransfer from './p2p-transfer';
import ApiErrorHandler from '../utils/apiErrorHandler';
import timeoutHandler from '../utils/timeoutHandler';
import healthMonitor from '../utils/healthMonitor';
import ApiConfig from '../utils/apiConfig';

class P2PFileShareAPI {
    // Backend URL for all environments
    static backendUrl = ApiConfig.getApiBaseUrl();
    
    // Parse the URL to avoid double /api/ paths
    static get apiBaseUrl() {
        return ApiConfig.getApiBaseUrl();
    }
    
    // Check if we're using Render.com hosted version
    static get isRenderHosted() {
        return ApiConfig.isRenderHosted();
    }
    
    // Get the appropriate API endpoint based on hosting environment
    static get p2pUploadUrl() {
        // Use minimal API for Render.com to reduce response size
        if (this.isRenderHosted) {
            return `${ApiConfig.getSocketUrl()}/api/upload-minimal/p2p`;
        }
        return `${ApiConfig.getSocketUrl()}/api/upload/p2p`;
    }

    // P2P-first upload with server fallback (main method)
    static async uploadFiles(files, onProgress) {
        return this.uploadFilesP2P(files, onProgress);
    }
  
    // P2P-first upload with server fallback
    static async uploadFilesP2P(files, onProgress) {
        try {
            console.log('🚀 Starting P2P-first file transfer...');
      
            if (!files || files.length === 0) {
                throw new Error('No files provided');
            }
            
            // Add retry mechanism for Render.com stability
            const retryOperation = async (operation, retries = 3, delay = 1000) => {
                try {
                    return await operation();
                } catch (err) {
                    if (retries <= 0) throw err;
                    console.log(`Operation failed, retrying in ${delay}ms... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return retryOperation(operation, retries - 1, delay * 1.5); // Exponential backoff
                }
            };
      
            // Check if P2P is supported
            if (!P2PFileTransfer.isSupported()) {
                console.log('❌ P2P not supported, falling back to server upload');
                return await this.uploadFilesDirect(files, onProgress);
            }
      
            // Generate transfer code first
            const fileMetadata = {
                fileNames: files.map(f => f.name),
                fileSizes: files.map(f => f.size),
                fileTypes: files.map(f => f.type)
            };
            
            console.log('📝 Registering P2P transfer...');
            // Use the improved API error handler for fetch with retry and robust parsing
            const result = await ApiErrorHandler.fetchWithRetry(
                P2PFileShareAPI.p2pUploadUrl,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fileMetadata)
                },
                3, // 3 retries
                1000 // 1 second initial delay
            );
            
            const transferCode = result.downloadCode;
      
            console.log(`✅ P2P transfer registered with code: ${transferCode}`);
      
            // Initialize P2P connection
            const p2p = new P2PFileTransfer();
            let p2pSuccess = false;
      
            // Set up P2P callbacks
            p2p.onErrorCallback = (error) => {
                console.log('❌ P2P failed:', error.message);
                p2pSuccess = false;
            };
      
            p2p.onCompleteCallback = () => {
                console.log('✅ P2P transfer completed');
                p2pSuccess = true;
            };
      
            try {
                // Try to establish P2P connection
                console.log('🔗 Establishing P2P connection...');
                await p2p.initiateSender(transferCode);
                // Wait for connection with timeout (increase for large files)
                await p2p.waitForConnection(2000); // 2 second timeout for P2P connection
        
                if (p2p.localConnection?.connectionState === 'connected') {
                    console.log('✅ P2P connection established, transferring files...');
          
                    // Transfer files via P2P
                    await new Promise((resolve, reject) => {
                        p2p.onProgressCallback = (progress) => {
                            if (onProgress) {
                                onProgress({
                                    fileName: progress.fileName,
                                    completed: progress.completed,
                                    index: progress.index,
                                    total: progress.total,
                                    type: 'p2p',
                                    percentage: progress.overallPercentage || progress.percentage,
                                    partProgress: progress.percentage
                                });
                            }
                        };
            
                        p2p.onCompleteCallback = () => {
                            p2pSuccess = true;
                            resolve();
                        };
            
                        p2p.onErrorCallback = (error) => {
                            console.log('❌ P2P transfer error:', error);
                            reject(error);
                        };
            
                        p2p.sendFiles(files, p2p.onProgressCallback);
                    });
          
                    if (p2pSuccess) {
                        return {
                            success: true,
                            downloadCode: transferCode,
                            method: 'p2p',
                            fileCount: files.length,
                            files: files.map(f => f.name)
                        };
                    }
                }
        
            } catch (error) {
                console.log('❌ P2P connection failed, falling back to server:', error.message);
            } finally {
                p2p.cleanup();
            }
      
            // Fallback to server upload
            console.log('⬆️ Falling back to server upload...');
            const serverResult = await this.uploadFilesDirect(files, onProgress);
            return {
                ...serverResult,
                method: 'server'
            };
      
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }
  
    // P2P-first download with server fallback
    static async downloadFileP2P(downloadCode, onProgress) {
        try {
            console.log('📥 Starting P2P-first download...');
      
            // Check if P2P is supported
            if (!P2PFileTransfer.isSupported()) {
                console.log('❌ P2P not supported, falling back to server download');
                return await this.downloadFile(downloadCode);
            }
      
            // Check if this is a P2P transfer
            const p2pCheck = await fetch(`${P2PFileShareAPI.apiBaseUrl}/download/p2p/check/${downloadCode}`);
      
            if (p2pCheck.ok) {
                // Get response text to debug any issues
                const responseText = await p2pCheck.text();
                let p2pInfo;
                
                try {
                    p2pInfo = JSON.parse(responseText);
                } catch (jsonError) {
                    console.error('Failed to parse P2P check response:', jsonError);
                    console.log('Response text:', responseText);
                    throw new Error('Failed to parse server response');
                }
        
                if (p2pInfo.available) {
                    console.log('🔗 P2P transfer available, attempting connection...');
          
                    // Initialize P2P connection as receiver
                    const p2p = new P2PFileTransfer();
                    let p2pSuccess = false;
          
                    // Set up P2P callbacks
                    p2p.onProgressCallback = (progress) => {
                        if (onProgress) {
                            onProgress({
                                fileName: progress.fileName,
                                completed: progress.completed,
                                index: progress.index,
                                total: progress.total,
                                type: 'p2p',
                                percentage: progress.overallPercentage || progress.percentage,
                                method: 'p2p'
                            });
                        }
                    };
          
                    p2p.onCompleteCallback = () => {
                        console.log('✅ P2P download completed');
                        p2pSuccess = true;
                    };
          
                    p2p.onErrorCallback = (error) => {
                        console.log('❌ P2P download failed:', error.message);
                        p2pSuccess = false;
                    };
          
                    try {
                        // Try to establish P2P connection
                        await p2p.initiateReceiver(downloadCode);
                        // Wait for P2P transfer with timeout (set to 0 for immediate fallback)
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error('P2P_DOWNLOAD_TIMEOUT'));
                            }, 0); // 0 second timeout for immediate fallback
                            
                            p2p.onCompleteCallback = () => {
                                clearTimeout(timeout);
                                p2pSuccess = true;
                                resolve();
                            };
              
                            p2p.onErrorCallback = (error) => {
                                clearTimeout(timeout);
                                reject(error);
                            };
                        });
            
                        if (p2pSuccess) {
                            console.log('✅ P2P download completed successfully');
                            return {
                                success: true,
                                method: 'p2p',
                                message: 'Files downloaded via P2P connection'
                            };
                        }
                    } catch (error) {
                        console.log('❌ P2P download failed, falling back to server:', error.message);
                    } finally {
                        p2p.cleanup();
                    }
                }
            }
            
            // Fallback to server download
            console.log('⬇️ Falling back to server download...');
            
            // Get file info first for progress reporting
            try {
                const fileInfo = await this.getFileInfo(downloadCode);
        
                // Report server download start
                if (onProgress && fileInfo.files) {
                    // Start with 0% progress for first file
                    onProgress({
                        fileName: fileInfo.files[0]?.filename || 'Downloading...',
                        completed: false,
                        index: 1,
                        total: fileInfo.files.length,
                        method: 'server',
                        percentage: 0
                    });
                }
                
                // Simulate progress during server download (faster updates)
                const progressInterval = setInterval(() => {
                    if (onProgress && fileInfo.files) {
                        // Simulate incremental progress
                        onProgress({
                            fileName: fileInfo.files[0]?.filename || 'Downloading...',
                            completed: false,
                            index: 1,
                            total: fileInfo.files.length,
                            method: 'server',
                            percentage: 50 // Show some progress
                        });
                    }
                }, 250); // Faster progress updates (reduced from 500ms)
        
                const result = await this.downloadFile(downloadCode);
        
                // Clear progress interval
                clearInterval(progressInterval);
        
                // Report completion
                if (onProgress && fileInfo.files) {
                    onProgress({
                        fileName: fileInfo.files[0]?.filename || 'Download Complete',
                        completed: true,
                        index: 1,
                        total: fileInfo.files.length,
                        method: 'server',
                        percentage: 100
                    });
                }
        
                return {
                    ...result,
                    method: 'server'
                };
        
            } catch (fileInfoError) {
                // Fallback without progress if file info fails
                console.log('⚠️ Failed to get file info, downloading without progress:', fileInfoError.message);
                const result = await this.downloadFile(downloadCode);
                return {
                    ...result,
                    method: 'server'
                };
            }
      
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }
  
    // Server-only upload (fallback method) - Optimized for speed and reliability
    static async uploadFilesDirect(files, onProgress) {
        let progressInterval = null;
        let timeoutId = null;
    
        try {
            console.log('📤 Starting server upload...');
      
            // Minimal progress simulation for better UX without slowing down upload
            if (onProgress) {
                // Start with initial progress
                onProgress({
                    fileName: files[0]?.name || 'Preparing...',
                    completed: false,
                    index: 1,
                    total: files.length,
                    type: 'server',
                    percentage: 0
                });
            }
      
            // Fast progress simulation with fewer updates
            let currentProgress = 0;
            progressInterval = setInterval(() => {
                if (currentProgress < 90) {
                    currentProgress += Math.random() * 20; // Larger increments for faster progress
                    if (onProgress) {
                        onProgress({
                            fileName: files[0]?.name || 'Uploading...',
                            completed: false,
                            index: 1,
                            total: files.length,
                            type: 'server',
                            percentage: Math.min(currentProgress, 90)
                        });
                    }
                }
            }, 500); // Slower interval but larger increments = faster overall
      
            const formData = new FormData();
      
            // Add files to form data
            files.forEach((file, index) => {
                formData.append('files', file);
            });
            
            // Calculate a reasonable timeout based on file size (2MB/s + 30s base)
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            const estimatedTimeoutMs = Math.max(30000, (totalSize / (2 * 1024 * 1024)) * 1000);
            console.log(`Setting upload timeout to ${Math.round(estimatedTimeoutMs / 1000)}s based on ${this.formatBytes(totalSize)} total`);
            
            // Create abort controller for timeout
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), estimatedTimeoutMs);
            
            const response = await fetch(`${P2PFileShareAPI.apiBaseUrl}/upload/multiple`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                // Add headers to prevent caching issues
                headers: {
                    'Cache-Control': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Clear timeout since request completed
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
      
            // Clear progress interval
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
      
            // Get response text first to debug any issues
            const responseText = await response.text();
            console.log('Server response text:', responseText);
      
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Failed to parse server response as JSON:', jsonError);
                throw new Error(`Upload failed: Invalid server response (${responseText.substring(0, 100)}...)`);
            }
      
            if (!response.ok) {
                throw new Error(result?.message || `Upload failed: ${response.statusText}`);
            }
      
            // Quick completion without delays
            if (onProgress) {
                // Show 100% completion immediately
                onProgress({
                    fileName: files[0]?.name || 'Upload Complete',
                    completed: true,
                    index: 1,
                    total: files.length,
                    type: 'server',
                    percentage: 100
                });
            }
      
            return result;
      
        } catch (error) {
            // Check for timeout error
            if (error.name === 'AbortError') {
                throw new Error('Upload timed out. Try with smaller files or check your connection.');
            }
            
            // Clean up intervals and timeouts
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            console.error('Server upload failed:', error);
            throw error;
        }
    }
  
    // Server-only download (fallback method)
    static async downloadFile(downloadCode) {
        try {
            console.log('⬇️ Starting server download...');
      
            const response = await fetch(`${P2PFileShareAPI.apiBaseUrl}/download/${downloadCode}`);
      
            if (!response.ok) {
                // Try to get error details from response
                const responseText = await response.text();
                let errorData = {};
                
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    console.log('Response is not JSON:', responseText);
                }
                
                throw new Error(errorData.message || `Download failed: ${response.statusText}`);
            }
      
            // Handle different content types
            const contentType = response.headers.get('content-type');
      
            if (contentType && contentType.includes('application/json')) {
                // Error response
                const errorText = await response.text();
                let errorData = {};
                
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.log('Error response is not valid JSON:', errorText);
                }
                
                throw new Error(errorData.error || 'Download failed');
            }
      
            // File download
            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
      
            let filename = `download-${downloadCode}`;
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
      
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
      
            return {
                success: true,
                message: 'Download completed successfully'
            };
      
        } catch (error) {
            console.error('Server download failed:', error);
            throw error;
        }
    }
  
    // Get file information
    static async getFileInfo(downloadCode) {
        try {
            const response = await fetch(`${P2PFileShareAPI.apiBaseUrl}/download/info/${downloadCode}`);
      
            if (!response.ok) {
                const responseText = await response.text();
                let errorData = {};
                
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    console.log('Response is not JSON:', responseText);
                }
                
                throw new Error(errorData.error || 'Failed to get file info');
            }
            
            const responseText = await response.text();
            try {
                return JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Failed to parse getFileInfo response:', jsonError);
                console.log('Response text:', responseText);
                throw new Error('Failed to parse server response');
            }
      
        } catch (error) {
            console.error('Get file info failed:', error);
            throw error;
        }
    }
  
    // Format bytes for display
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
    
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
        const i = Math.floor(Math.log(bytes) / Math.log(k));
    
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
  
    // Generate share link with 6-digit code
    static generateShareLink(downloadCode) {
        return `${window.location.origin}/share/${downloadCode}`;
    }
  
    // Copy text to clipboard
    static copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return Promise.resolve();
            } catch (err) {
                document.body.removeChild(textArea);
                return Promise.reject(err);
            }
        }
    }
}

export default P2PFileShareAPI;