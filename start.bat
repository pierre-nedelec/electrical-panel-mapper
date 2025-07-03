@echo off
title Electrical Panel Mapper

echo 🔌 Starting Electrical Panel Mapper...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js and npm found
echo.

:: Start backend
echo 🚀 Starting backend server...
cd electrical-panel-backend

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
)

:: Start backend
start "Backend Server" npm start

echo ✅ Backend started on http://localhost:3001
echo.

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
echo 🚀 Starting frontend application...
cd ..\electrical-panel-mapper

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
)

echo ✅ Frontend starting on http://localhost:3002
echo.
echo 🎉 Application is ready!
echo    - Frontend: http://localhost:3002
echo    - Backend: http://localhost:3001
echo.
echo Press Ctrl+C to stop the frontend, then close the backend window
echo.

:: Start frontend
npm start

echo.
echo 🛑 Frontend stopped
echo Please close the backend server window manually
pause
