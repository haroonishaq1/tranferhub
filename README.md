# SendAnywhere Clone

A web-based file transfer application similar to SendAnywhere that allows instant file sharing between devices using 6-digit codes and WebRTC for peer-to-peer transfers.

## Features

- **Instant Code Generation**: Generate 6-digit codes instantly without uploading files to the server
- **Peer-to-Peer Transfer**: Direct file transfers between devices using WebRTC
- **QR Code Support**: Generate and scan QR codes for easy connection
- **Multiple File Support**: Send multiple files in a single transfer
- **Real-time Progress**: Live transfer progress with visual feedback
- **Cross-Platform**: Works on any device with a modern web browser
- **No File Size Limits**: Only limited by browser memory
- **Secure**: Files are transferred directly between devices, not stored on servers

## Technology Stack

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **PostgreSQL** - Database for session management
- **QRCode** - QR code generation

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **WebRTC** - Peer-to-peer file transfers
- **Socket.io Client** - Real-time communication
- **SimplePeer** - WebRTC wrapper library
- **jsQR** - QR code scanning

## Project Structure

```
hub/
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables
│   ├── config/
│   │   └── db.js             # Database setup
│   └── routes/
│       ├── fileRoutes.js     # File transfer API routes
│       └── authRoutes.js     # User authentication routes
├── frontend/
│   ├── index.html            # Main HTML file
│   ├── package.json          # Frontend metadata
│   ├── css/
│   │   └── style.css         # Application styles
│   └── js/
│       └── app.js            # Main application logic
└── package.json              # Root package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Modern web browser with WebRTC support

### Installation

1. **Clone or create the project structure** as shown above

2. **Install dependencies**:
   ```bash
   cd hub
   npm run install-all
   ```

3. **Configure PostgreSQL**:
   - Create a PostgreSQL database named `sendanywhere_clone`
   - Update the `.env` file in the backend directory with your database credentials:
   ```env
   PORT=5000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=sendanywhere_clone
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Initialize the database**:
   ```bash
   npm run setup
   ```

5. **Start the application**:
   ```bash
   npm run dev
   ```

6. **Access the application**:
   Open your browser and navigate to `http://localhost:4999`

## How to Use

### Sending Files

1. **Select Files**: Click the upload area or drag and drop files
2. **Generate Code**: Click "Generate Code" to create a 6-digit transfer code
3. **Share Code**: Share the 6-digit code or QR code with the recipient
4. **Wait for Connection**: The transfer will start automatically when the recipient joins

### Receiving Files

1. **Enter Code**: Type the 6-digit code in the "Receive Files" section
2. **Connect**: Click "Receive" to connect to the sender
3. **Download**: Files will be available for download as they are received

### QR Code Method

1. **Scan QR**: Use the "Scan QR Code" feature to open your camera
2. **Point Camera**: Point your camera at the QR code displayed by the sender
3. **Auto-Connect**: The app will automatically extract the code and connect

## API Endpoints

### File Transfer Routes (`/api/files`)
- `POST /generate-code` - Generate a new transfer code
- `GET /generate-qr/:code` - Generate QR code for a transfer code
- `GET /verify-code/:code` - Verify if a code is valid
- `POST /log-transfer` - Log successful transfer statistics

### Authentication Routes (`/api/auth`) [Optional]
- `POST /register` - Register a new user
- `POST /login` - User login
- `GET /profile` - Get user profile

## Database Schema

### transfer_sessions
- `id` - Primary key
- `code` - 6-digit transfer code
- `sender_socket_id` - Socket ID of the sender
- `receiver_socket_id` - Socket ID of the receiver
- `completed` - Transfer completion status
- `created_at` - Creation timestamp
- `expires_at` - Expiration timestamp (10 minutes)

### transfer_stats
- `id` - Primary key
- `transfer_code` - Associated transfer code
- `file_count` - Number of files transferred
- `total_size` - Total size of files transferred
- `sender_id` - User ID (if authenticated)
- `completed_at` - Completion timestamp
- `created_at` - Creation timestamp

## Security Features

- **Temporary Codes**: Transfer codes expire after 10 minutes
- **Direct P2P**: Files are transferred directly between devices
- **No Server Storage**: Files are never stored on the server
- **Session Cleanup**: Automatic cleanup of expired sessions
- **WebRTC Encryption**: Built-in WebRTC encryption for data transfers

## Browser Compatibility

- Chrome 50+
- Firefox 44+
- Safari 11+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Troubleshooting

### Common Issues

1. **Connection Failed**: 
   - Check if both devices are on the same network or have internet access
   - Ensure WebRTC is supported in your browser
   - Try refreshing the page and generating a new code

2. **Database Connection Error**:
   - Verify PostgreSQL is running
   - Check database credentials in `.env` file
   - Ensure database `sendanywhere_clone` exists

3. **File Transfer Slow**:
   - Large files may take time depending on network speed
   - WebRTC uses available bandwidth optimally
   - Consider splitting very large files

4. **QR Code Not Scanning**:
   - Ensure camera permissions are granted
   - Try better lighting conditions
   - Make sure QR code is clearly visible and not blurry

## Development Notes

- The application uses WebRTC for direct peer-to-peer file transfers
- Socket.io is used for signaling and connection establishment
- Files are chunked into 16KB pieces for reliable transfer
- Progress tracking is implemented for both sending and receiving
- The UI is responsive and works on mobile devices
- No external dependencies for the frontend (vanilla JavaScript)

For questions or support, please create an issue in the repository.
