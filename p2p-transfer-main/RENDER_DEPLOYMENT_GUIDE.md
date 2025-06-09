# Render.com Deployment Guide - P2P File Transfer with Connection Reset Fixes

## 🚀 Pre-Deployment Checklist

### ✅ Enhanced Database Connection Features
- [x] **Database retry logic** with exponential backoff (3 attempts max)
- [x] **Connection pool optimization** for Render.com free tier (max 5 connections)
- [x] **Enhanced error handling** for connection resets (ECONNRESET, ETIMEDOUT)
- [x] **Keepalive configuration** for stable connections
- [x] **Statement and query timeouts** configured (30s)
- [x] **Health monitoring** with connection status tracking
- [x] **Upload route protection** with database error recovery and file cleanup
- [x] **Server-level health checks** every 30 seconds

### ✅ Modified Files
- `/backend/config/database.js` - Enhanced with retry logic and Render.com optimizations
- `/backend/routes/upload.js` - Updated with database error handling and cleanup
- `/backend/server.js` - Added database health monitoring and enhanced health endpoint
- `/backend/test-db-enhanced.js` - Comprehensive connection testing script

---

## 🏗️ Render.com Deployment Steps

### 1. Prepare Your Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "feat: add enhanced database connection handling for Render.com"
git push origin main
```

### 2. Create PostgreSQL Database on Render.com
1. Go to Render.com Dashboard
2. Click "New" → "PostgreSQL"
3. Choose settings:
   - **Name**: `p2p-transfer-db`
   - **Database**: `file_transfer`
   - **User**: `postgres` (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Free ($0/month)
4. Click "Create Database"
5. **Save the DATABASE_URL** - you'll need this for the web service

### 3. Create Web Service on Render.com
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure settings:
   - **Name**: `p2p-transfer-app`
   - **Environment**: Node
   - **Region**: Same as database
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 4. Set Environment Variables
In the Render.com web service settings, add these environment variables:

#### Required Variables
```bash
# Database (use the DATABASE_URL from step 2)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Node Environment
NODE_ENV=production

# AWS S3 (if using file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET_NAME=your_bucket_name_here

# Optional: Custom Port (Render.com will override this)
PORT=3000
```

### 5. Database Schema Setup
After deployment, initialize your database tables:

```sql
-- Connect to your PostgreSQL database on Render.com and run:
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    s3_key VARCHAR(500),
    expiry_date TIMESTAMP
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_files_code ON files(code);
CREATE INDEX IF NOT EXISTS idx_files_expiry ON files(expiry_date);
```

---

## 🔧 Enhanced Connection Features Verification

### Health Monitoring Endpoint
After deployment, test the health endpoint:
```bash
curl https://your-app-name.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "database": {
    "connected": true,
    "consecutiveFailures": 0,
    "responseTime": 45,
    "lastChecked": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Database Connection Reset Handling
The enhanced connection handling will automatically:
1. **Detect connection resets** (ECONNRESET, ETIMEDOUT)
2. **Retry queries** with exponential backoff (100ms, 200ms, 400ms delays)
3. **Limit connection pool** to 5 concurrent connections
4. **Monitor database health** every 30 seconds
5. **Clean up files** if database insertion fails during upload

---

## 🚨 Troubleshooting Connection Issues

### Check Database Logs
1. Go to Render.com Dashboard → Your PostgreSQL service
2. Click "Logs" tab
3. Look for connection issues or "Connection reset by peer" errors

### Check Application Logs
1. Go to Render.com Dashboard → Your Web service
2. Click "Logs" tab
3. Look for database retry attempts and health check results

### Common Issues and Solutions

#### Issue: "Unexpected end of JSON input"
**Solution**: ✅ **FIXED** - Enhanced error handling now catches database connection resets and provides proper error responses

#### Issue: "Connection reset by peer"
**Solution**: ✅ **FIXED** - Retry logic with exponential backoff handles temporary connection issues

#### Issue: "Too many connections"
**Solution**: ✅ **FIXED** - Connection pool limited to 5 for Render.com free tier

#### Issue: Database queries hanging
**Solution**: ✅ **FIXED** - Statement timeout set to 30 seconds prevents hanging queries

---

## 📊 Monitoring and Maintenance

### Regular Health Checks
Monitor these endpoints regularly:
- `GET /api/health` - Overall application health
- `GET /api/health/database` - Detailed database status (if implemented)

### Database Connection Metrics
The application now tracks:
- Connection success/failure rates
- Response times
- Consecutive failure counts
- Pool utilization

### Performance Optimization
For production workloads, consider:
1. **Upgrading database plan** for higher connection limits
2. **Implementing Redis caching** for frequently accessed data
3. **Adding connection pooling** at the application level
4. **Setting up monitoring alerts** for connection failures

---

## 🎯 Testing Your Deployment

### 1. Test File Upload
```bash
curl -X POST -F "file=@test.txt" https://your-app-name.onrender.com/api/upload
```

### 2. Test File Download
```bash
curl https://your-app-name.onrender.com/api/download/ABC123
```

### 3. Test Health Endpoint
```bash
curl https://your-app-name.onrender.com/api/health
```

### 4. Load Test (Optional)
Use tools like `ab` or `wrk` to test under load:
```bash
# Test with 10 concurrent connections
ab -n 100 -c 10 https://your-app-name.onrender.com/api/health
```

---

## ✅ Success Criteria

Your deployment is successful when:
- [x] Health endpoint returns `"status": "healthy"`
- [x] Database connection shows `"connected": true`
- [x] File uploads complete without "Unexpected end of JSON input" errors
- [x] Application handles connection resets gracefully
- [x] Upload routes clean up files on database failures
- [x] No "Connection reset by peer" errors in logs

---

## 🔗 Useful Links

- [Render.com Documentation](https://render.com/docs)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Node.js Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

---

**🚀 Your P2P file transfer application is now ready for production deployment on Render.com with robust database connection handling!**
