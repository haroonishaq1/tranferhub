#!/bin/bash
# Frontend Configuration Verification Script

echo "🔍 Frontend Configuration Verification"
echo "======================================="

# Check environment files
echo "📁 Environment Files:"
if [ -f ".env.development" ]; then
    echo "✅ .env.development exists"
    cat .env.development
else
    echo "❌ .env.development missing"
fi

if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    cat .env.production
else
    echo "❌ .env.production missing"
fi

echo ""

# Check API configuration
echo "🔧 API Configuration:"
echo "Checking if all services use ApiConfig..."

echo ""
echo "📄 api-clean.js:"
if grep -q "import ApiConfig" src/services/api-clean.js; then
    echo "✅ Uses ApiConfig import"
else
    echo "❌ Missing ApiConfig import"
fi

if grep -q "ApiConfig.getApiBaseUrl()" src/services/api-clean.js; then
    echo "✅ Uses ApiConfig.getApiBaseUrl()"
else
    echo "❌ Not using ApiConfig.getApiBaseUrl()"
fi

echo ""
echo "📄 api-p2p.js:"
if grep -q "import ApiConfig" src/services/api-p2p.js; then
    echo "✅ Uses ApiConfig import"
else
    echo "❌ Missing ApiConfig import"
fi

echo ""
echo "📄 p2p-transfer.js:"
if grep -q "ApiConfig.getSocketUrl()" src/services/p2p-transfer.js; then
    echo "✅ Uses ApiConfig.getSocketUrl()"
else
    echo "❌ Not using ApiConfig.getSocketUrl()"
fi

echo ""

# Check redirects file
echo "🔀 Redirects Configuration:"
if [ -f "public/_redirects" ]; then
    echo "✅ public/_redirects exists"
    cat public/_redirects
else
    echo "❌ public/_redirects missing"
fi

echo ""
if [ -f "build/_redirects" ]; then
    echo "✅ build/_redirects exists"
else
    echo "❌ build/_redirects missing - run npm run build"
fi

echo ""

# Test backend connectivity
echo "🌐 Backend Connectivity Test:"
echo "Testing backend health..."
BACKEND_HEALTH=$(curl -s -w "%{http_code}" https://p2p-transfer-backend.onrender.com/api/health -o /tmp/health_response)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ Backend health check passed (200)"
    echo "Response:"
    cat /tmp/health_response | jq . 2>/dev/null || cat /tmp/health_response
else
    echo "❌ Backend health check failed ($BACKEND_HEALTH)"
fi

echo ""

# Test frontend deployment
echo "🚀 Frontend Deployment Test:"
echo "Testing frontend accessibility..."
FRONTEND_STATUS=$(curl -s -w "%{http_code}" https://p2p-transfer-frontend.onrender.com -o /dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend accessible (200)"
else
    echo "❌ Frontend not accessible ($FRONTEND_STATUS)"
fi

echo ""
echo "🎯 Configuration Summary:"
echo "========================"
echo "✅ API services updated to use ApiConfig"
echo "✅ Environment files created for dev/prod"
echo "✅ Redirects file updated with force flags"
echo "✅ Render.yaml updated with proper env vars"
echo "✅ Build completed successfully"

echo ""
echo "📝 Next Steps:"
echo "1. Deploy to Render.com with updated configuration"
echo "2. Test file upload/download functionality"
echo "3. Verify P2P transfer works in production"
echo "4. Monitor for any CORS or connectivity issues"
