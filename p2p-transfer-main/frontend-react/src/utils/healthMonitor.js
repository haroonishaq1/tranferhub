
/**
 * Health monitoring service for the P2P transfer application
 * Helps track API connectivity and performance in different environments
 */
import ApiConfig from './apiConfig';

class HealthMonitor {
  constructor() {
    this.isRenderEnvironment = window.location.hostname.includes('render.com') || 
                              window.location.hostname.includes('onrender.com');
    this.healthCheckInterval = null;
    this.healthStatus = {
      apiConnected: false,
      lastChecked: null,
      responseTime: null,
      serverMemory: null,
      uploadReliability: 'unknown', // 'good', 'degraded', 'poor'
      healthyUploadSize: 10 * 1024 * 1024, // 10MB initially
    };
    
    // More frequent checks on Render.com
    this.checkIntervalMs = this.isRenderEnvironment ? 30000 : 60000;
  }
  
  /**
   * Get base API URL
   */
  get apiBaseUrl() {
    return `${ApiConfig.getSocketUrl()}/api/health`;
  }
  
  /**
   * Start health monitoring
   */
  startMonitoring() {
    // Do an immediate check
    this.checkHealth();
    
    // Set up recurring checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.checkIntervalMs);
    
    return this.healthCheckInterval;
  }
  
  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Check API health
   */
  async checkHealth() {
    const startTime = performance.now();
    
    try {
      // Add cache-busting parameter
      const timestamp = Date.now();
      const response = await fetch(`${this.apiBaseUrl}?_=${timestamp}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      const endTime = performance.now();
      this.healthStatus.responseTime = Math.round(endTime - startTime);
      
      if (response.ok) {
        const data = await response.json();
        this.healthStatus.apiConnected = true;
        this.healthStatus.lastChecked = new Date();
        this.healthStatus.serverMemory = data.memory;
        
        // Determine upload reliability based on memory usage and response time
        this.updateReliabilityMetrics(data);
        
        console.log('✅ API health check successful:', this.healthStatus);
      } else {
        this.healthStatus.apiConnected = false;
        console.log('❌ API health check failed:', response.status, response.statusText);
      }
    } catch (error) {
      this.healthStatus.apiConnected = false;
      console.error('❌ API health check error:', error);
    }
    
    return this.healthStatus;
  }
  
  /**
   * Update reliability metrics based on health check data
   * @param {Object} data - Health check response data
   */
  updateReliabilityMetrics(data) {
    // If we're on Render.com's free tier, adjust expectations
    if (this.isRenderEnvironment) {
      // Check memory pressure
      if (data.memory) {
        const heapUsed = parseInt(data.memory.heapUsed);
        const heapTotal = parseInt(data.memory.heapTotal);
        
        if (!isNaN(heapUsed) && !isNaN(heapTotal)) {
          const memoryUsageRatio = heapUsed / heapTotal;
          
          if (memoryUsageRatio > 0.85) {
            // High memory pressure
            this.healthStatus.uploadReliability = 'poor';
            this.healthStatus.healthyUploadSize = 2 * 1024 * 1024; // 2MB
          } else if (memoryUsageRatio > 0.70) {
            // Medium memory pressure
            this.healthStatus.uploadReliability = 'degraded';
            this.healthStatus.healthyUploadSize = 5 * 1024 * 1024; // 5MB
          } else {
            // Low memory pressure
            this.healthStatus.uploadReliability = 'good';
            this.healthStatus.healthyUploadSize = 10 * 1024 * 1024; // 10MB
          }
        }
      }
      
      // Also factor in response time
      if (this.healthStatus.responseTime > 2000) {
        // Downgrade if response time is too high
        this.healthStatus.uploadReliability = 'degraded';
      }
    }
  }
  
  /**
   * Get current health status
   */
  getStatus() {
    return this.healthStatus;
  }
  
  /**
   * Check if chunked upload is recommended based on file size and current health
   * @param {number} fileSize - Size of file in bytes
   * @returns {boolean} - Whether chunked upload is recommended
   */
  shouldUseChunkedUpload(fileSize) {
    // Always use chunked uploads on Render.com, unless file is very small
    if (this.isRenderEnvironment && fileSize > 500 * 1024) { // > 500KB
      return true;
    }
    
    // Based on current health status
    return fileSize > this.healthStatus.healthyUploadSize;
  }
  
  /**
   * Get recommended chunk size based on current health
   * @returns {number} - Recommended chunk size in bytes
   */
  getRecommendedChunkSize() {
    if (!this.isRenderEnvironment) {
      return 10 * 1024 * 1024; // 10MB for non-Render environments
    }
    
    // Adjust chunk size based on health
    switch (this.healthStatus.uploadReliability) {
      case 'poor':
        return 1 * 1024 * 1024; // 1MB
      case 'degraded':
        return 2 * 1024 * 1024; // 2MB
      case 'good':
      default:
        return 5 * 1024 * 1024; // 5MB
    }
  }
}

// Export singleton instance
export default new HealthMonitor();
