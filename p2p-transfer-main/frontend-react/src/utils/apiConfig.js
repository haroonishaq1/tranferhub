// API Configuration utility for consistent endpoint management
class ApiConfig {
  // Get the base API URL based on environment
  static getApiBaseUrl() {
    // Priority: Environment variable > Development default > Production default
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5000/api';
    }
    
    return 'https://p2p-transfer-backend.onrender.com/api';
  }

  // Get the WebSocket URL for P2P signaling
  static getSocketUrl() {
    // Priority: Environment variable > Development default > Production default
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5000';
    }
    
    return 'https://p2p-transfer-backend.onrender.com';
  }

  // Check if running in development mode
  static isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  // Check if running on Render.com
  static isRenderHosted() {
    return window.location.hostname.includes('render.com') || 
           window.location.hostname.includes('onrender.com');
  }

  // Get appropriate timeout values based on environment
  static getTimeouts() {
    return {
      upload: this.isDevelopment() ? 60000 : 300000, // 1 min dev, 5 min prod
      download: this.isDevelopment() ? 30000 : 60000, // 30s dev, 1 min prod
      p2pConnection: this.isDevelopment() ? 5000 : 30000, // 5s dev, 30s prod
    };
  }

  // Build complete endpoint URL
  static buildEndpoint(path) {
    const baseUrl = this.getApiBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  // Build WebSocket endpoint URL
  static buildSocketEndpoint(path = '') {
    const baseUrl = this.getSocketUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }
}

export default ApiConfig;
