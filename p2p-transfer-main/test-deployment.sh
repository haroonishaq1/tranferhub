#!/bin/bash

# P2P File Transfer - Deployment Test Script
# Tests all backend functionality after deployment

echo "🧪 Testing P2P File Transfer Deployment"
echo "========================================"

BACKEND_URL="https://p2p-transfer-backend.onrender.com"
FRONTEND_URL="https://p2p-transfer-frontend.onrender.com"

# Test 1: Health Check
echo -e "\n1️⃣ Testing Health Endpoint..."
response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BACKEND_URL/api/health")
if [ "${response: -3}" = "200" ]; then
    echo "✅ Health check passed"
    echo "📊 Memory: $(cat /tmp/health_response.json | jq -r '.memory.rss')"
    echo "🗄️  Database: $(cat /tmp/health_response.json | jq -r '.database.status')"
else
    echo "❌ Health check failed (HTTP $response)"
    exit 1
fi

# Test 2: Single File Upload
echo -e "\n2️⃣ Testing Single File Upload..."
echo "Single file test content" > /tmp/single_test.txt
upload_response=$(curl -s -X POST -F "file=@/tmp/single_test.txt" "$BACKEND_URL/api/upload/single")
download_code=$(echo $upload_response | jq -r '.downloadCode')

if [ "$download_code" != "null" ] && [ "$download_code" != "" ]; then
    echo "✅ Single file upload successful (Code: $download_code)"
else
    echo "❌ Single file upload failed"
    echo "Response: $upload_response"
    exit 1
fi

# Test 3: Download Single File
echo -e "\n3️⃣ Testing File Download..."
download_response=$(curl -s "$BACKEND_URL/api/download/$download_code")
if echo "$download_response" | grep -q "Single file test content"; then
    echo "✅ File download successful"
else
    echo "❌ File download failed"
    echo "Response: $download_response"
    exit 1
fi

# Test 4: Multiple File Upload
echo -e "\n4️⃣ Testing Multiple File Upload..."
echo "First file content" > /tmp/file1.txt
echo "Second file content" > /tmp/file2.txt
multi_response=$(curl -s -X POST -F "files=@/tmp/file1.txt" -F "files=@/tmp/file2.txt" "$BACKEND_URL/api/upload/multiple")
multi_code=$(echo $multi_response | jq -r '.downloadCode')

if [ "$multi_code" != "null" ] && [ "$multi_code" != "" ]; then
    echo "✅ Multiple file upload successful (Code: $multi_code)"
    echo "📁 Files: $(echo $multi_response | jq -r '.files | join(", ")')"
else
    echo "❌ Multiple file upload failed"
    echo "Response: $multi_response"
    exit 1
fi

# Test 5: P2P Transfer Registration
echo -e "\n5️⃣ Testing P2P Transfer Registration..."
p2p_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"fileNames":["test-p2p.txt","document.pdf"],"fileSizes":[1024,2048],"fileTypes":["text/plain","application/pdf"]}' \
    "$BACKEND_URL/api/upload/p2p")
p2p_code=$(echo $p2p_response | jq -r '.downloadCode')

if [ "$p2p_code" != "null" ] && [ "$p2p_code" != "" ]; then
    echo "✅ P2P transfer registration successful (Code: $p2p_code)"
else
    echo "❌ P2P transfer registration failed"
    echo "Response: $p2p_response"
    exit 1
fi

# Test 6: P2P Fallback Upload
echo -e "\n6️⃣ Testing P2P Fallback Upload..."
echo "P2P fallback test content" > /tmp/p2p_fallback.txt
fallback_response=$(curl -s -X POST -F "files=@/tmp/p2p_fallback.txt" "$BACKEND_URL/api/upload/fallback/$p2p_code")
fallback_success=$(echo $fallback_response | jq -r '.success')

if [ "$fallback_success" = "true" ]; then
    echo "✅ P2P fallback upload successful"
else
    echo "❌ P2P fallback upload failed"
    echo "Response: $fallback_response"
    exit 1
fi

# Test 7: Signaling Server
echo -e "\n7️⃣ Testing Signaling Server..."
signaling_response=$(curl -s "$BACKEND_URL/api/signaling/status/$p2p_code")
message_count=$(echo $signaling_response | jq -r '.messageCount')

if [ "$message_count" = "0" ]; then
    echo "✅ Signaling server operational"
else
    echo "❌ Signaling server test failed"
    echo "Response: $signaling_response"
    exit 1
fi

# Test 8: Frontend Accessibility
echo -e "\n8️⃣ Testing Frontend Accessibility..."
frontend_status=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL")
if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible (HTTP $frontend_status)"
    exit 1
fi

# Test 9: Upload Route Health
echo -e "\n9️⃣ Testing Upload Route Health..."
upload_health=$(curl -s "$BACKEND_URL/api/upload/health")
health_status=$(echo $upload_health | jq -r '.success')

if [ "$health_status" = "true" ]; then
    echo "✅ Upload routes healthy"
else
    echo "❌ Upload routes unhealthy"
    echo "Response: $upload_health"
    exit 1
fi

# Test 10: API Info
echo -e "\n🔟 Testing API Info..."
info_response=$(curl -s "$BACKEND_URL/api/info")
api_status=$(echo $info_response | jq -r '.status')

if [ "$api_status" = "online" ]; then
    echo "✅ API info accessible"
    echo "📊 Version: $(echo $info_response | jq -r '.version')"
else
    echo "❌ API info failed"
    echo "Response: $info_response"
    exit 1
fi

# Cleanup
rm -f /tmp/single_test.txt /tmp/file1.txt /tmp/file2.txt /tmp/p2p_fallback.txt /tmp/health_response.json

echo -e "\n🎉 ALL TESTS PASSED!"
echo "✨ P2P File Transfer application is fully operational!"
echo ""
echo "📋 Summary:"
echo "   Frontend: $FRONTEND_URL ✅"
echo "   Backend:  $BACKEND_URL ✅"
echo "   Features: Single Upload ✅ | Multiple Upload ✅ | P2P Transfer ✅ | Download ✅ | Signaling ✅"
echo ""
echo "🔗 Ready for production use!"
