// Quick test script to verify API configuration
import ApiConfig from './src/utils/apiConfig.js';

console.log('=== API Configuration Test ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', ApiConfig.getApiBaseUrl());
console.log('Socket URL:', ApiConfig.getSocketUrl());
console.log('Is Development:', ApiConfig.isDevelopment());
console.log('Is Render Hosted:', ApiConfig.isRenderHosted());
console.log('Timeouts:', ApiConfig.getTimeouts());

// Test the actual endpoint URLs
console.log('\n=== API Endpoints ===');
console.log('Health Check:', `${ApiConfig.getApiBaseUrl()}/health`);
console.log('Upload Single:', `${ApiConfig.getApiBaseUrl()}/upload/single`);
console.log('Upload P2P:', `${ApiConfig.getApiBaseUrl()}/upload/p2p`);
console.log('Download:', `${ApiConfig.getApiBaseUrl()}/download`);
console.log('Signaling:', `${ApiConfig.getApiBaseUrl()}/signaling`);
