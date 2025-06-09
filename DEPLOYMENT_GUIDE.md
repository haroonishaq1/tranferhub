📋 **RENDER DEPLOYMENT GUIDE - MANUAL SETUP**

## Step 1: Create PostgreSQL Database

1. Go to [render.com](https://render.com) and log in
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `tranferhub-db`
   - **Database Name**: `sendanywhere_clone` 
   - **User**: `postgres`
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 15 (default)
   - **Plan**: Free
4. Click "Create Database"
5. **Important**: Copy the "External Database URL" - you'll need this

## Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `tranferhub`
   - **Region**: Same as your database
   - **Branch**: `master` or `main`
   - **Root Directory**: (leave empty)
   - **Runtime**: `Node`
   - **Build Command**: `npm run install-all`
   - **Start Command**: `npm start`
   - **Plan**: Free

## Step 3: Environment Variables

In your web service settings, add these environment variables:

**Required:**
```
NODE_ENV=production
JWT_SECRET=your_secure_random_jwt_secret_here_make_it_long_and_random
DATABASE_URL=postgresql://postgres:password@hostname:port/sendanywhere_clone
```

**How to get DATABASE_URL:**
- Go to your PostgreSQL database in Render dashboard
- Click on "Connect"
- Copy the "External Database URL"
- Paste it as the value for DATABASE_URL

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will start building and deploying
3. Monitor the logs for any errors
4. Once successful, you'll get a URL like: `https://tranferhub.onrender.com`

## Troubleshooting Tips

**Build Fails:**
- Check that all dependencies are in package.json
- Ensure build command is correct: `npm run install-all`

**Database Connection Issues:**
- Verify DATABASE_URL is correct
- Check that database is in same region as web service
- Ensure database is running (green status)

**Application Won't Start:**
- Check start command: `npm start`
- Verify NODE_ENV is set to production
- Check server logs for specific errors
