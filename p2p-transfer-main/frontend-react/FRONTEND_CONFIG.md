# Frontend Configuration Guide

## Overview
The frontend has been configured to work seamlessly with the backend endpoints. All API calls are now properly routed and environment-aware.

## Key Changes Made

### 1. Environment Configuration
- **Development**: Connects to `http://localhost:5000/api`
- **Production**: Connects to `https://p2p-transfer-backend.onrender.com/api`
- Environment variables in `.env` and `.env.production` control these URLs

### 2. API Services Updated
- `api.js` - Main file sharing API
- `api-p2p.js` - P2P-first transfer API  
- `api-clean.js` - Clean API implementation
- `p2p-transfer.js` - WebRTC P2P transfer service

### 3. New Configuration Utility
- `utils/apiConfig.js` - Centralized configuration management
- Handles environment detection and URL building
- Provides consistent timeout values

### 4. Backend Endpoint Mapping

#### Upload Endpoints
- **Single file**: `POST /api/upload/single`
- **Multiple files**: `POST /api/upload/multiple`
- **P2P metadata**: `POST /api/upload/p2p`

#### Download Endpoints
- **File info**: `GET /api/download/info/{code}`
- **Download file**: `GET /api/download/{code}`
- **P2P check**: `GET /api/download/p2p/check/{code}`

#### Other Endpoints
- **Health check**: `GET /api/health`
- **Signaling**: `POST /api/signaling`
- **Socket.IO**: `ws://backend/socket.io`

### 5. Development Setup

#### Environment Variables
```bash
# .env (Development)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000

# .env.production (Production)
REACT_APP_API_URL=https://p2p-transfer-backend.onrender.com/api
REACT_APP_BACKEND_URL=https://p2p-transfer-backend.onrender.com
```

#### Package.json Proxy
- Development proxy: `"proxy": "http://localhost:5000"`
- Routes `/api/*` requests to local backend during development

### 6. Production Deployment

#### Netlify/Render.com
- `_redirects` file handles API routing to backend
- `_headers` file sets CORS and security headers
- Environment variables override development defaults

#### Backend Requirements
- Backend must be running on `https://p2p-transfer-backend.onrender.com`
- CORS must allow frontend domain
- All API routes must be under `/api` prefix

### 7. Testing the Configuration

#### Health Check
```bash
# Frontend package.json includes:
npm run check-api
# Calls: curl -v https://p2p-transfer-backend.onrender.com/api/health
```

#### Development Testing
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend-react && npm start`
3. Upload a file and verify the API calls in browser dev tools

#### Production Testing
1. Deploy backend to Render.com
2. Deploy frontend to Netlify/Render.com
3. Test file upload/download functionality

### 8. Troubleshooting

#### Common Issues
1. **CORS errors**: Check backend CORS configuration
2. **404 on API calls**: Verify `_redirects` file and backend URL
3. **P2P not working**: Check WebSocket connection and signaling server

#### Debug Tools
- Browser dev tools Network tab
- Backend server logs
- Frontend console logs with API request URLs

## File Structure
```
frontend-react/
├── .env                    # Development environment
├── .env.production         # Production environment
├── package.json           # Proxy configuration
├── public/
│   ├── _redirects         # Production API routing
│   └── _headers           # CORS headers
├── src/
│   ├── services/
│   │   ├── api.js         # Main API service
│   │   ├── api-p2p.js     # P2P API service
│   │   └── p2p-transfer.js # P2P WebRTC service
│   └── utils/
│       └── apiConfig.js   # Configuration utility
```

## Next Steps
1. Test all upload/download functionality
2. Verify P2P transfers work correctly
3. Check WebSocket signaling connection
4. Monitor API response times and error rates
