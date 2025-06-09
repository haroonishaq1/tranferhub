// Backend-connected file sharing service
import ApiConfig from '../utils/apiConfig.js';

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

  // Upload single file
  static async uploadFile(file, maxDownloads = null) {
    try {
      console.log('📤 Uploading single file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      if (maxDownloads) {
        formData.append('maxDownloads', maxDownloads);
      }

      const response = await fetch(`${this.BASE_URL}/upload/single`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Upload multiple files
  static async uploadMultipleFiles(files, maxDownloads = null) {
    try {
      console.log('📤 Uploading multiple files:', files.length);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (maxDownloads) {
        formData.append('maxDownloads', maxDownloads);
      }

      const response = await fetch(`${this.BASE_URL}/upload/multiple`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Multiple upload successful:', result);
      return result;
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
        
        if (contentType && contentType.includes('application/zip')) {
          // Multiple files - ZIP archive download
          console.log('📦 ZIP archive download detected');
          this.triggerDirectDownload(`${this.BASE_URL}/download/${code}`, `files_${code}.zip`);
          return { 
            success: true, 
            message: 'ZIP archive download started',
            type: 'zip'
          };
        } else {
          // Single file - direct download
          console.log('📥 Direct file download...');
          this.triggerDirectDownload(`${this.BASE_URL}/download/${code}`);
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
