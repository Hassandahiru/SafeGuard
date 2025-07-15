#!/bin/bash

# SafeGuard Manual API Test Script
# Run this in a new terminal while the server is running

echo "🧪 SafeGuard API Manual Test"
echo "============================"
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Health Check
echo "📋 Test 1: Health Check"
echo "Command: curl $BASE_URL/health"
echo "Expected: Status 200 with healthy response"
echo "----------------------------------------"
curl -w "\nHTTP Status: %{http_code}\n\n" $BASE_URL/health
echo ""

# Test 2: API Info
echo "📋 Test 2: API Info"
echo "Command: curl $BASE_URL/api"
echo "Expected: API information with endpoints"
echo "----------------------------------------"
curl -w "\nHTTP Status: %{http_code}\n\n" $BASE_URL/api
echo ""

# Test 3: Authentication Test (should fail without credentials)
echo "📋 Test 3: Authentication Test (should fail)"
echo "Command: curl $BASE_URL/api/visitors"
echo "Expected: 401 Unauthorized"
echo "----------------------------------------"
curl -w "\nHTTP Status: %{http_code}\n\n" $BASE_URL/api/visitors
echo ""

echo "✅ Basic connectivity tests completed!"
echo ""
echo "🔌 Next Steps for Socket.io Testing:"
echo "1. Open browser and go to: http://localhost:3000"
echo "2. Open browser console (F12)"
echo "3. Run the Socket.io test commands provided below"
echo ""
echo "🎯 If all tests show HTTP Status: 200, your API is working!"