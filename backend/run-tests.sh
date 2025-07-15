#!/bin/bash

# SafeGuard API Test Runner
# This script installs dependencies, starts the server, and runs comprehensive API tests

echo "🚀 SafeGuard API Test Runner"
echo "============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   Try: brew services start postgresql@17"
    exit 1
fi

# Check if database exists
if ! psql -U dahiruadoh -d safeguard_db -c "SELECT 1;" &> /dev/null; then
    echo "❌ SafeGuard database not accessible. Please check your database setup."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create .env file from .env.example"
    echo "   cp .env.example .env"
    echo "   Then edit .env with your database password"
    exit 1
fi

echo "✅ Environment configuration found"

# Start the server in background
echo "🚀 Starting SafeGuard server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Server failed to start or is not responding"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server is running and healthy"

# Run the comprehensive API tests
echo "🧪 Running comprehensive API tests..."
echo "====================================="

npm run test:api

TEST_EXIT_CODE=$?

# Stop the server
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Report results
echo "====================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed! SafeGuard API is working perfectly!"
else
    echo "❌ Some tests failed. Please check the output above."
fi

echo "📋 Test run completed."
exit $TEST_EXIT_CODE