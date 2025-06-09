# 🚀 P2P File Transfer App

A modern, secure peer-to-peer file sharing application with server backup fallback, built with React frontend and Node.js backend.

## ✨ Features

- **🔐 Secure File Sharing**: 6-digit code verification system
- **⚡ P2P Transfer**: Direct browser-to-browser file transfer using WebRTC
- **🔄 Server Backup**: Automatic fallback to server transfer when P2P fails
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🕒 Auto Expiry**: Files automatically expire after 7 days
- **📊 Real-time Progress**: Live upload/download progress tracking
- **🎨 Modern UI**: Beautiful, intuitive interface with smooth animations

## 🏗️ Architecture

- **Frontend**: React 19+ with modern hooks and styled-components
- **Backend**: Node.js with Express, optimized for Render.com deployment
- **Database**: PostgreSQL for metadata storage
- **P2P**: WebRTC for direct browser connections
- **Deployment**: Render.com with Blueprint deployment

## 🚀 Quick Deployment to Render.com

### Option 1: One-Click Blueprint Deployment (Recommended)

1. **Fork this repository** to your GitHub account
2. **Create Render account** at [render.com](https://render.com)
3. **Deploy using Blueprint**:
   - Click "New" → "Blueprint" 
   - Connect your GitHub repository
   - Select this repository
   - Render will automatically detect `render.yaml`
   - Click "Apply Blueprint"

### Option 2: Manual Setup

1. **Create PostgreSQL Database**:
   - Name: `p2p-transfer-db`
   - Plan: Free tier

2. **Create Backend Web Service**:
   - Name: `p2p-transfer-backend`
   - Build Command: `cd backend && npm install && npm run init-db`
   - Start Command: `cd backend && npm start`
   - Environment Variables:
     ```
     NODE_ENV=production
     DATABASE_URL=[auto-generated from database]
     ```

3. **Create Frontend Static Site**:
   - Name: `p2p-transfer-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Root Directory: `frontend-react`

## 🔧 Local Development

### Prerequisites

- Node.js 18+ 
- PostgreSQL
- Git

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd p2p-transfer
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   cd backend && npm install

   # Frontend  
   cd ../frontend-react && npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy template and fill in your values
   cp .env.template .env
   ```

4. **Start PostgreSQL** and create database:
   ```sql
   CREATE DATABASE file_transfer;
   ```

5. **Initialize database**:
   ```bash
   cd backend && npm run init-db
   ```

6. **Start development servers**:
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev

   # Frontend (Terminal 2) 
   cd frontend-react && npm start
   ```

## 📁 Project Structure

```
├── backend/                 # Node.js API server
│   ├── config/             # Database configuration  
│   ├── routes/             # API route handlers
│   ├── scripts/            # Database migration scripts
│   └── server.js           # Express server entry point
├── frontend-react/         # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── render.yaml             # Render.com deployment configuration
└── build.sh               # Production build script
```

## 🔐 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Application  
NODE_ENV=production
PORT=5000
MAX_FILE_SIZE=52428800
FILE_EXPIRY_HOURS=168
```

### Frontend
```bash
# API endpoint (auto-configured for Render.com)
REACT_APP_API_URL=/api
```

## 🌐 API Endpoints

- `GET /api/health` - Health check with system status
- `POST /api/upload` - Upload file and get 6-digit code  
- `GET /api/download/:code` - Download file by code
- `POST /api/chunked-upload` - Chunked upload for large files
- `WebSocket /api/signaling` - P2P connection signaling

## 🛡️ Security Features

- **Code Verification**: 6-digit alphanumeric codes for access control
- **File Expiry**: Automatic cleanup after configurable time period  
- **Input Validation**: Comprehensive request validation and sanitization
- **CORS Protection**: Configured for secure cross-origin requests
- **Rate Limiting**: Built-in protection against abuse

## 📊 Performance Optimizations

- **P2P Priority**: Direct browser transfers for fastest speeds
- **Chunked Uploads**: Large file handling with progress tracking
- **Connection Pooling**: Optimized database connections for Render.com
- **Memory Management**: Automatic garbage collection and monitoring
- **Compression**: Response compression for faster data transfer

## 🔍 Monitoring & Health Checks

- **Health Endpoint**: `/api/health` provides system status
- **Database Monitoring**: Connection health and performance metrics
- **Memory Tracking**: Real-time memory usage monitoring
- **Error Handling**: Comprehensive error tracking and recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name` 
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See `RENDER_DEPLOYMENT_GUIDE.md` for detailed deployment instructions
- **Issues**: Open an issue on GitHub for bug reports
- **Render.com**: Check [Render.com documentation](https://render.com/docs) for platform-specific help

---

**⭐ Star this repository if you found it helpful!**
