#!/bin/bash

# Deployment status check script for Render.com
echo "🔍 Checking P2P Transfer App deployment status..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we have the required files
echo -e "\n📋 Checking deployment files:"

files=("render.yaml" "build.sh" "RENDER_DEPLOYMENT_GUIDE.md" "README.md")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file ${GREEN}[EXISTS]${NC}"
    else
        echo -e "  ❌ $file ${RED}[MISSING]${NC}"
    fi
done

# Check backend files
echo -e "\n🔧 Checking backend structure:"
backend_files=("backend/package.json" "backend/server.js" "backend/config/database.js")
for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file ${GREEN}[EXISTS]${NC}"
    else
        echo -e "  ❌ $file ${RED}[MISSING]${NC}"
    fi
done

# Check frontend files  
echo -e "\n⚛️ Checking frontend structure:"
frontend_files=("frontend-react/package.json" "frontend-react/src/App.js" "frontend-react/public/index.html")
for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file ${GREEN}[EXISTS]${NC}"
    else
        echo -e "  ❌ $file ${RED}[MISSING]${NC}"
    fi
done

# Check for removed files that shouldn't be in production
echo -e "\n🧹 Checking for cleaned files:"
removed_files=("docs/" "test-api-connections.js" "CONNECTION_RESET_FIX_SUMMARY.md" "frontend-react/public/upload-test.html")
for file in "${removed_files[@]}"; do
    if [ ! -e "$file" ]; then
        echo -e "  ✅ $file ${GREEN}[REMOVED]${NC}"
    else
        echo -e "  ⚠️  $file ${YELLOW}[STILL EXISTS]${NC}"
    fi
done

echo -e "\n🚀 ${GREEN}Deployment preparation complete!${NC}"
echo -e "📖 Next steps:"
echo -e "  1. Commit your changes: ${YELLOW}git add . && git commit -m 'Prepare for Render.com deployment'${NC}"
echo -e "  2. Push to GitHub: ${YELLOW}git push origin main${NC}"
echo -e "  3. Deploy on Render.com using Blueprint method"
echo -e "  4. See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions"
