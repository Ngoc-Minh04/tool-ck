@echo off
title VN Stock AI Predictor - Quick Start
color 0B

echo ========================================
echo  VN Stock AI Predictor v2.0
echo  FastAPI + vnstock3 + Claude AI (Mock Mode)
echo ========================================
echo.

:: 1. Navigate to backend and setup/run
cd /d "%~dp0vn-stock-ai\backend"
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment and installing backend dependencies...
call venv\Scripts\activate
pip install -r requirements.txt -q

if not exist .env (
    copy .env.example .env
    echo Created backend .env file.
)

echo Starting Backend API on port 8000...
start "Backend API" cmd /k "cd /d \"%~dp0vn-stock-ai\backend\" && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: 2. Navigate to frontend and setup/run
cd /d "%~dp0"
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

if not exist .env (
    copy .env.example .env
    echo Created frontend .env file.
)

echo Starting Frontend on port 5173...
start "Frontend" cmd /k "cd /d \"%~dp0\" && npm run dev"

timeout /t 2 /nobreak >nul

echo ========================================
echo  Application is running!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo ========================================
echo.

start http://localhost:5173
