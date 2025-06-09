// Compatibility wrapper for InstantFileShare functionality
// This replaces the removed instant-file-share.js service
import P2PFileShareAPI from './api-p2p';
import FileShareAPI from './api';

class InstantFileShare {
  constructor() {
    this.currentTransfer = null;
  }

  // Generate code and prepare transfer (compatible with existing FileTransfer.js)
  async generateCodeAndPrepareTransfer(files, statusCallback, progressCallback) {
    try {
      console.log('🚀 InstantFileShare: Starting file upload...');
      
      // Status update: generating code
      if (statusCallback) {
        statusCallback({ status: 'generating-code' });
      }

      // Use P2P-first upload
      const result = await P2PFileShareAPI.uploadFilesP2P(files, (progress) => {
        if (progressCallback) {
          progressCallback(progress);
        }
      });

      // Status update: ready with code
      if (statusCallback && result.code) {
        statusCallback({ 
          status: 'ready', 
          code: result.code,
          files: result.files || []
        });
      }

      return result;

    } catch (error) {
      console.error('❌ InstantFileShare upload error:', error);
      
      // Fallback to regular server upload
      try {
        console.log('🔄 Falling back to server upload...');
        
        const fallbackResult = await FileShareAPI.uploadFiles(files, (progress) => {
          if (progressCallback) {
            progressCallback(progress);
          }
        });

        if (statusCallback && fallbackResult.code) {
          statusCallback({ 
            status: 'ready', 
            code: fallbackResult.code,
            files: fallbackResult.files || []
          });
        }

        return fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Fallback upload also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Receive files with P2P-first approach (compatible with existing FileTransfer.js)
  async receiveFiles(code, progressCallback, statusCallback) {
    try {
      console.log('📥 InstantFileShare: Starting file download...');
      
      // Status update: connecting
      if (statusCallback) {
        statusCallback({ status: 'connecting' });
      }

      // Try P2P download first
      try {
        const result = await P2PFileShareAPI.downloadFiles(code, (progress) => {
          if (progressCallback) {
            progressCallback({
              percentage: progress.percentage || 0,
              fileName: progress.fileName || 'Downloading...',
              index: progress.index || 1,
              type: 'p2p'
            });
          }
        });

        if (statusCallback) {
          statusCallback({ status: 'completed', method: 'p2p' });
        }

        return result;

      } catch (p2pError) {
        console.log('🔄 P2P download failed, falling back to server...');
        
        // Fallback to server download
        const result = await FileShareAPI.downloadFile(code, (progress) => {
          if (progressCallback) {
            progressCallback({
              percentage: progress.percentage || 0,
              fileName: progress.fileName || 'Downloading...',
              index: progress.index || 1,
              type: 'server'
            });
          }
        });

        if (statusCallback) {
          statusCallback({ status: 'completed', method: 'server' });
        }

        return result;
      }

    } catch (error) {
      console.error('❌ InstantFileShare download error:', error);
      
      if (statusCallback) {
        statusCallback({ status: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  // Additional compatibility methods if needed
  async uploadFiles(files, options = {}) {
    return this.generateCodeAndPrepareTransfer(
      files, 
      options.statusCallback, 
      options.progressCallback
    );
  }

  async downloadFiles(code, options = {}) {
    return this.receiveFiles(
      code, 
      options.progressCallback, 
      options.statusCallback
    );
  }
}

export default InstantFileShare;
