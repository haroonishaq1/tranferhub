# TransferHub - Render Deployment Guide

## Deployment Steps on Render

### 1. Database Setup (PostgreSQL)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure your database:
   - **Name**: `tranferhub-db`
   - **Database**: `tranferhub`
   - **User**: `tranferhub_user`
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 15 (recommended)
   - **Plan**: Free (for testing) or paid plan for production

4. After creation, note down the **External Database URL** - you'll need this for the web service.

### 2. Web Service Setup

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `tranferhub`
   - **Environment**: `Node`
   - **Region**: Same as your database
   - **Branch**: `main` (or your primary branch)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### 3. Environment Variables

Add these environment variables in your Render web service:

**Required:**
- `NODE_ENV`: `production`
- `DATABASE_URL`: [Your PostgreSQL External Database URL from step 1]
- `JWT_SECRET`: [Generate a secure random string]

**Optional (with defaults):**
- `PORT`: `10000` (Render will set this automatically)

### 4. Connect Database to Web Service

1. In your web service settings, go to "Environment"
2. Click "Add Environment Variable"
3. Add `DATABASE_URL` and paste the External Database URL from your PostgreSQL service

### 5. Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Start the server
   - Initialize the database tables

## Important Notes

### Database Connection
- The app automatically detects if `DATABASE_URL` is available (production) or uses individual env vars (development)
- SSL is automatically enabled for production database connections
- Database tables are created automatically on first startup

### File Storage
- Files are stored in memory for transfer sessions
- Uploaded files are stored in `backend/uploads/` (this directory is created automatically)
- On Render's free plan, files are ephemeral and will be deleted when the service restarts

### WebRTC & Socket.io
- The app uses Socket.io for real-time communication
- WebRTC is used for peer-to-peer file transfers
- CORS is configured to allow connections from any origin

### Monitoring
- Check the logs in Render dashboard for any issues
- The app includes health check endpoint at `/api`
- Database connection status is logged on startup

## Local Development

To run locally after Render setup:

```bash
# Install dependencies
npm run install-all

# Set up local environment
cp backend/.env.example backend/.env
# Edit backend/.env with your local database credentials

# Initialize local database
npm run setup

# Start development server
npm run dev
```

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Verify `DATABASE_URL` is correctly set
   - Check if PostgreSQL service is running
   - Ensure SSL settings are correct

2. **Build Failed**
   - Check if all dependencies are listed in package.json
   - Verify Node.js version compatibility
   - Check build logs for specific errors

3. **File Upload Issues**
   - Ensure uploads directory exists and is writable
   - Check file size limits in your code
   - Verify multer configuration

4. **Socket.io Connection Issues**
   - Check CORS configuration
   - Verify WebSocket support is enabled
   - Check for firewall or proxy issues

### Support
- Check Render docs: https://render.com/docs
- Review application logs in Render dashboard
- Test locally first to isolate issues
