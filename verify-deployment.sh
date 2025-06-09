#!/bin/bash

# Render Deployment Verification Script
echo "🚀 TransferHub Deployment Verification"
echo "========================================"

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./verify-deployment.sh <your-render-url>"
    echo "Example: ./verify-deployment.sh https://tranferhub.onrender.com"
    exit 1
fi

URL=$1
echo "Testing deployment at: $URL"
echo ""

# Test main page
echo "1. Testing main page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" = "200" ]; then
    echo "✅ Main page is accessible"
else
    echo "❌ Main page returned status: $STATUS"
fi

# Test API endpoints
echo ""
echo "2. Testing API endpoints..."

# Test code generation
echo "   - Testing code generation API..."
RESPONSE=$(curl -s -X POST "$URL/api/files/generate-code" \
  -H "Content-Type: application/json" \
  -d '{"fileCount": 1, "totalSize": 1000}')

if echo "$RESPONSE" | grep -q "code"; then
    echo "✅ Code generation API working"
    CODE=$(echo "$RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
    echo "   Generated code: $CODE"
    
    # Test code verification
    echo "   - Testing code verification API..."
    VERIFY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/files/verify-code/$CODE")
    if [ "$VERIFY_STATUS" = "200" ]; then
        echo "✅ Code verification API working"
    else
        echo "❌ Code verification failed with status: $VERIFY_STATUS"
    fi
else
    echo "❌ Code generation API failed"
fi

echo ""
echo "3. Testing Socket.io connection..."
echo "   (This requires browser testing - check browser console for Socket.io connection)"

echo ""
echo "🎉 Deployment verification complete!"
echo ""
echo "Next Steps:"
echo "1. Open $URL in your browser"
echo "2. Test file transfer functionality"
echo "3. Check browser console for any JavaScript errors"
echo "4. Verify WebRTC peer-to-peer connection works"
