#!/bin/bash

# Sub-Admin Dashboard Integration Setup Verification

echo "==================================="
echo "Sub-Admin Dashboard Integration Setup"
echo "==================================="
echo ""

# Check backend dependencies
echo "Checking backend dependencies..."
cd backend
if npm list express-fileupload > /dev/null 2>&1; then
  echo "✓ express-fileupload is installed"
else
  echo "✗ express-fileupload is NOT installed"
  echo "  Run: npm install express-fileupload"
fi

# Check env variables
echo ""
echo "Checking .env configuration..."
if [ -f .env ]; then
  if grep -q "APPWRITE_BUCKET_ID" .env; then
    echo "✓ APPWRITE_BUCKET_ID is set"
  else
    echo "✗ APPWRITE_BUCKET_ID is NOT set in .env"
  fi
  
  if grep -q "APPWRITE_ENDPOINT" .env; then
    echo "✓ APPWRITE_ENDPOINT is set"
  else
    echo "✗ APPWRITE_ENDPOINT is NOT set in .env"
  fi
else
  echo "✗ .env file not found in backend/"
fi

echo ""
echo "==================================="
echo "Configuration Summary"
echo "==================================="
echo "1. Backend file upload route: POST /api/resources"
echo "2. Get user resources route: GET /api/resources/user"
echo "3. File storage: Appwrite Cloud Storage"
echo "4. Resource metadata: MongoDB"
echo "5. Frontend: SubAdminDashboard component"
echo ""
echo "To start testing:"
echo "  1. cd backend && npm run dev"
echo "  2. Navigate to Sub-Admin Dashboard"
echo "  3. Upload a resource with file and thumbnail"
echo ""
