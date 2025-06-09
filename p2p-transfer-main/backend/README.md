# File Transfer Backend

A Node.js/Express backend for secure file transfers with 6-digit verification codes.

## Features

- 🔐 6-digit code verification for file access
- 📁 Single and multiple file uploads
- 📦 Automatic ZIP archiving for multiple files
- 🗄️ PostgreSQL database for metadata storage
- ⏰ Automatic file expiration
- 📊 Download statistics and logging
- 🚀 Direct download to browser's Downloads folder (no popup)

## Prerequisites

- Node.js (v14+)
- PostgreSQL database
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Initialize the database:
```bash
npm run init-db
```

4. Start the server:
```bash
npm run dev
```

## Environment Variables

- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: file_transfer)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `PORT` - Server port (default: 5000)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 50MB)
- `FILE_EXPIRY_HOURS` - Hours until files expire (default: 168 = 7 days)

## API Endpoints

### Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `GET /api/upload/stats` - Get upload statistics

### Download
- `GET /api/download/info/:code` - Get file information by code
- `GET /api/download/:code` - Download files by code
- `GET /api/download/stats/:code` - Get download statistics

### Health
- `GET /api/health` - Server health check

## Database Schema

### Files Table
- `id` - Primary key
- `download_code` - 6-digit verification code
- `file_names` - Array of original file names
- `file_paths` - Array of stored file paths
- `file_sizes` - Array of file sizes
- `file_types` - Array of MIME types
- `upload_date` - Upload timestamp
- `expires_at` - Expiration timestamp
- `download_count` - Number of downloads
- `ip_address` - Uploader IP
- `user_agent` - Uploader browser

### Download Logs Table
- `id` - Primary key
- `download_code` - Reference to files table
- `download_date` - Download timestamp
- `ip_address` - Downloader IP
- `user_agent` - Downloader browser

## File Storage

Files are stored in the `uploads/` directory with unique filenames to prevent conflicts.

## Security Features

- File type validation
- Size limits
- IP and User-Agent logging
- Automatic file expiration
- Unique 6-digit codes
- SQL injection protection

## Development

```bash
npm run dev  # Start with nodemon for auto-restart
npm start    # Start production server
npm run init-db  # Initialize/reset database
```
