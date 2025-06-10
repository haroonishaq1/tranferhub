#!/bin/bash

echo "🚀 Starting TransferHub build verification..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Check npm version
NPM_VERSION=$(npm --version)
echo "✅ npm version: $NPM_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Verify package.json files exist
if [ ! -f "package.json" ]; then
    echo "❌ Root package.json not found"
    exit 1
fi

if [ ! -f "backend/package.json" ]; then
    echo "❌ Backend package.json not found"
    exit 1
fi

echo "✅ Package files verified"

# Check if frontend files exist
if [ ! -f "frontend/index.html" ]; then
    echo "❌ Frontend index.html not found"
    exit 1
fi

echo "✅ Frontend files verified"

# Check if backend files exist
if [ ! -f "backend/server.js" ]; then
    echo "❌ Backend server.js not found"
    exit 1
fi

echo "✅ Backend files verified"

echo "🎉 Build verification completed successfully!"
echo ""
echo "Next steps for Render deployment:"
echo "1. Push your code to GitHub"
echo "2. Create a PostgreSQL database on Render"
echo "3. Create a Web Service on Render"
echo "4. Set environment variables (DATABASE_URL, JWT_SECRET, NODE_ENV=production)"
echo "5. Deploy!"
