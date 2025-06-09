#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting P2P Transfer deployment build..."

# Set error handling
set -e

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --only=production

# Run database initialization
echo "🔨 Initializing database..."
npm run init-db

# Clean up any temporary files
echo "🧹 Cleaning up temporary files..."
rm -rf node_modules/.cache || true
rm -rf .npm || true

echo "✅ Backend build completed successfully!"

# Return to root
cd ..

echo "🎉 Deployment build completed successfully!"
