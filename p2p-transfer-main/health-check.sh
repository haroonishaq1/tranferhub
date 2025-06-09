#!/bin/bash

# Post-deployment health check script
# Usage: ./health-check.sh [backend-url]

BACKEND_URL=${1:-"http://localhost:5000"}
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🏥 Running health checks for P2P Transfer App..."
echo "🔗 Backend URL: $BACKEND_URL"

# Check backend health endpoint
echo -e "\n1️⃣ Checking backend health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/health" || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "   ✅ Backend health: ${GREEN}HEALTHY${NC}"
    
    # Get detailed health info
    echo -e "\n📊 Backend details:"
    curl -s "$BACKEND_URL/api/health" | grep -o '"status":"[^"]*"' | sed 's/"status":"/   Status: /' | sed 's/"//'
    curl -s "$BACKEND_URL/api/health" | grep -o '"connected":[^,]*' | sed 's/"connected":/   Database: /' | sed 's/true/✅ Connected/' | sed 's/false/❌ Disconnected/'
else
    echo -e "   ❌ Backend health: ${RED}FAILED${NC} (HTTP: $HEALTH_RESPONSE)"
fi

# Check file upload endpoint
echo -e "\n2️⃣ Checking upload endpoint..."
UPLOAD_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/upload" || echo "000")

if [ "$UPLOAD_RESPONSE" = "400" ] || [ "$UPLOAD_RESPONSE" = "405" ]; then
    echo -e "   ✅ Upload endpoint: ${GREEN}ACCESSIBLE${NC} (expected 400/405 without file)"
else
    echo -e "   ⚠️  Upload endpoint: ${YELLOW}UNEXPECTED RESPONSE${NC} (HTTP: $UPLOAD_RESPONSE)"
fi

# Test database connectivity (if health endpoint worked)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "\n3️⃣ Checking database status..."
    DB_STATUS=$(curl -s "$BACKEND_URL/api/health" | grep -o '"connected":[^,]*' | grep -o '[^:]*$')
    if [ "$DB_STATUS" = "true" ]; then
        echo -e "   ✅ Database: ${GREEN}CONNECTED${NC}"
    else
        echo -e "   ❌ Database: ${RED}CONNECTION FAILED${NC}"
    fi
fi

echo -e "\n🎯 Health check complete!"
echo -e "💡 For frontend checks, visit your frontend URL in a browser"
