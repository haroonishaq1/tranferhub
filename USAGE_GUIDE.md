# SendAnywhere Clone - Quick Setup Guide

A peer-to-peer file transfer application similar to SendAnywhere, built with Node.js, Express, Socket.io, and vanilla JavaScript.

## Features

🚀 **Instant Code Generation** - Generate 6-digit codes instantly without uploading files
📁 **Direct P2P Transfer** - Files transfer directly between devices using WebRTC
🔒 **Secure Transfer** - End-to-end encrypted file transfers
📱 **QR Code Support** - Generate QR codes for easy mobile device connections
⏱️ **Time-Limited Codes** - Codes expire after 10 minutes for security
💾 **Multi-File Support** - Send multiple files in one transfer
📊 **Progress Tracking** - Real-time transfer progress updates
🎨 **Modern UI** - Clean, responsive design

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (optional - will use memory storage if not available)

### Setup
1. **Clone and Install**
   ```bash
   cd hub/backend
   npm install
   ```

2. **Environment Configuration**
   Update `.env` file in `/backend` folder with your database credentials:
   ```
   PORT=5000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=sendanywhere_clone
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   ```

3. **Start the Application**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open your browser and go to: `http://localhost:4999`

## How It Works

### Sending Files
1. **Select Files**: Drag & drop or click to select files
2. **Generate Code**: Click "Generate Code" to get a 6-digit transfer code
3. **Share Code**: Share the code or QR code with the receiver
4. **Wait for Connection**: The transfer starts automatically when receiver connects
5. **Transfer Complete**: Files are sent directly to receiver's device

### Receiving Files
1. **Enter Code**: Type the 6-digit code in the "Receive Files" section
2. **Connect**: Click "Receive" to connect to the sender
3. **Download**: Files will be downloaded automatically to your device

### QR Code Transfer
1. **Generate Code**: Sender generates a transfer code
2. **Scan QR**: Receiver scans the QR code with camera
3. **Auto-Connect**: Automatically connects and starts transfer

## Technical Architecture

### Backend (Node.js + Express)
- **Socket.io**: Real-time communication between sender and receiver
- **PostgreSQL**: Stores transfer sessions and user data (optional)
- **Memory Storage**: Fallback storage when database is unavailable
- **Express Routes**: API endpoints for code generation and verification

### Frontend (Vanilla JavaScript)
- **WebRTC**: Peer-to-peer file transfer using SimplePeer
- **Socket.io Client**: Real-time communication with server
- **File API**: Handle file selection and reading
- **QR Code Scanner**: Camera-based QR code scanning

### Key Differences from Traditional File Upload Services
- ✅ **No File Upload**: Files are never uploaded to server
- ✅ **Instant Codes**: Codes generated immediately
- ✅ **Direct Transfer**: P2P connection between devices
- ✅ **Privacy Focused**: Files never stored on server
- ✅ **Faster Transfer**: Direct device-to-device transfer

## File Transfer Flow

1. **Sender** selects files and generates code
2. **Server** creates a temporary session with 6-digit code
3. **Receiver** enters code to join the session
4. **Server** facilitates WebRTC connection setup
5. **P2P Connection** established between sender and receiver
6. **Files** transferred directly between devices
7. **Session** automatically cleaned up after transfer

## API Endpoints

- `GET /` - Main application page
- `GET /receive/:code` - Direct receive page for QR codes
- `POST /api/files/generate-code` - Generate transfer code
- `GET /api/files/verify-code/:code` - Verify if code is valid
- `GET /api/files/generate-qr/:code` - Generate QR code for transfer
- `POST /api/files/log-transfer` - Log completed transfer stats

## Development Features

- **Hot Reload**: Nodemon for automatic server restart
- **Error Handling**: Graceful fallbacks for database connectivity
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Mobile Friendly**: Responsive design for mobile devices

## Security Features

- 🔐 **Time-Limited Sessions**: Codes expire after 10 minutes
- 🔒 **No Server Storage**: Files never stored on server
- 🛡️ **WebRTC Encryption**: End-to-end encrypted transfers
- 🔑 **Unique Codes**: Cryptographically secure random codes
- 🧹 **Auto Cleanup**: Sessions automatically cleaned up

## Browser Compatibility

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Troubleshooting

### Database Connection Issues
- Application will automatically fall back to memory storage
- Check PostgreSQL credentials in `.env` file
- Ensure PostgreSQL service is running

### WebRTC Connection Issues
- Check firewall settings
- Ensure both devices are on same network for best performance
- Some corporate networks may block WebRTC

### File Transfer Failures
- Check file size limits (browser dependent)
- Ensure stable internet connection
- Try refreshing both sender and receiver pages

## Production Deployment

For production deployment:
1. Set up PostgreSQL database
2. Configure environment variables
3. Use process manager like PM2
4. Set up reverse proxy (nginx)
5. Enable HTTPS for WebRTC compatibility

## Support

For issues or questions, check the server console for error messages and ensure all dependencies are properly installed.
