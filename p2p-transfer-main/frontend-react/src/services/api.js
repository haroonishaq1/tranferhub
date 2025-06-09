import ApiConfig from '../utils/apiConfig';

// Backend-connected file sharing service
class FileShareAPI {
  static BASE_URL = ApiConfig.getApiBaseUrl();

  // Helper method for API calls
  static async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.BASE_URL}${endpoint}`;
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }
  // Upload single file with progress callback
  static async uploadFile(file, maxDownloads = null, onProgress = null) {
    try {
      console.log('📤 Uploading single file:', file.name);
      
      if (onProgress) {
        onProgress({
          fileName: file.name,
          completed: false,
          index: 1,
          total: 1,
          type: 'server',
          percentage: 0
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      if (maxDownloads) {
        formData.append('maxDownloads', maxDownloads);
      }

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentage = Math.round((e.loaded / e.total) * 100);
              onProgress({
                fileName: file.name,
                completed: false,
                index: 1,
                total: 1,
                type: 'server',
                percentage: percentage
              });
            }
          });
        }

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (onProgress) {
                onProgress({
                  fileName: file.name,
                  completed: true,
                  index: 1,
                  total: 1,
                  type: 'server',
                  percentage: 100
                });
              }
              console.log('✅ Upload successful:', result);
              resolve(result);
            } catch (parseError) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${this.BASE_URL}/upload/single`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
  // Upload multiple files with progress callback
  static async uploadMultipleFiles(files, maxDownloads = null, onProgress = null) {
    try {
      console.log('📤 Uploading multiple files:', files.length);
      
      if (onProgress) {
        onProgress({
          fileName: `${files.length} files`,
          completed: false,
          index: 0,
          total: files.length,
          type: 'server',
          percentage: 0
        });
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (maxDownloads) {
        formData.append('maxDownloads', maxDownloads);
      }

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentage = Math.round((e.loaded / e.total) * 100);
              onProgress({
                fileName: `${files.length} files`,
                completed: false,
                index: Math.floor((e.loaded / e.total) * files.length) + 1,
                total: files.length,
                type: 'server',
                percentage: percentage
              });
            }
          });
        }

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (onProgress) {
                onProgress({
                  fileName: `${files.length} files`,
                  completed: true,
                  index: files.length,
                  total: files.length,
                  type: 'server',
                  percentage: 100
                });
              }
              console.log('✅ Multiple upload successful:', result);
              resolve(result);
            } catch (parseError) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${this.BASE_URL}/upload/multiple`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw error;
    }
  }

  // Get file information by code
  static async getFileInfo(code) {
    try {
      if (!this.validateCode(code)) {
        throw new Error('Invalid code format. Code must be 6 digits.');
      }

      console.log('📋 Getting file info for code:', code);
      return await this.makeRequest(`/download/info/${code}`);
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }
  // Download file by code - handles both single and multiple files
  static async downloadFile(code) {
    try {
      if (!this.validateCode(code)) {
        throw new Error('Invalid code format. Code must be 6 digits.');
      }

      console.log('📥 Downloading file with code:', code);
      
      // Try to fetch the download endpoint
      const response = await fetch(`${this.BASE_URL}/download/${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, */*'
        }
      });

      console.log(`📊 Download response status: ${response.status}`);
      console.log(`📊 Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        
        // Build absolute URL for download - needed for proper browser download
        const downloadUrl = this.getAbsoluteDownloadUrl(`/download/${code}`);
        
        if (contentType && contentType.includes('application/zip')) {
          // Multiple files - ZIP archive download
          console.log('📦 ZIP archive download detected');
          this.triggerDirectDownload(downloadUrl, `files_${code}.zip`);
          return { 
            success: true, 
            message: 'ZIP archive download started',
            type: 'zip'
          };
        } else {
          // Single file - direct download
          console.log('📥 Direct file download...');
          this.triggerDirectDownload(downloadUrl);
          return { 
            success: true, 
            message: 'File download started',
            type: 'single'
          };
        }
      } else if (response.status === 404) {
        throw new Error('File not found or has expired');
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid download code');
      } else {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  // Helper method to build absolute URLs for downloads
  static getAbsoluteDownloadUrl(path) {
    // Use the BASE_URL directly since it's already configured correctly
    return `${this.BASE_URL}${path}`;
  }

  // Helper method to trigger direct download
  static triggerDirectDownload(url, filename = null) {
    try {
      console.log(`🔗 Triggering download: ${url}`);
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      
      if (filename) {
        link.download = filename;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ Download triggered for: ${filename || 'file'}`);
    } catch (error) {
      console.error('❌ Failed to trigger download:', error);
      throw new Error('Failed to start download');
    }
  }

  // Check server health
  static async checkHealth() {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  // Format file size
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Validate 6-digit code
  static validateCode(code) {
    return /^\d{6}$/.test(code);
  }
}

export default FileShareAPI;
