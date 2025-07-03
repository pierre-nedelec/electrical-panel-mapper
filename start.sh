#!/bin/bash

# Start Electrical Panel Mapper Application

echo "🔌 Starting Electrical Panel Mapper..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm found"
echo ""

# Start backend
echo "🚀 Starting backend server..."
cd electrical-panel-backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Start backend in background
npm start &
BACKEND_PID=$!

echo "✅ Backend started on http://localhost:3001 (PID: $BACKEND_PID)"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🚀 Starting frontend application..."
cd ../electrical-panel-mapper

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "✅ Frontend starting on http://localhost:3002"
echo ""
echo "🎉 Application is ready!"
echo "   - Frontend: http://localhost:3002"
echo "   - Backend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Start frontend (this will block)
npm start

# If we get here, frontend was stopped, so stop backend too
echo ""
echo "🛑 Stopping backend server..."
kill $BACKEND_PID 2>/dev/null
echo "✅ Application stopped"
