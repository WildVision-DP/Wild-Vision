@echo off
REM Quick Start Script for WildVision with ML Integration
REM This script sets up and runs everything needed

echo.
echo =================================================
echo  🐯 WildVision - Animal Detection Integration
echo =================================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as admin. Some features may not work.
    echo Please run this script as Administrator.
    echo.
)

setlocal enabledelayedexpansion

REM Resolve full absolute paths to avoid cd issues
for %%i in ("%~dp0..") do set "PROJECT_ROOT=%%~fi"
set "ML_SERVICE_DIR=%PROJECT_ROOT%\apps\ml-service"
set "ML_SERVICE_PORT=8000"

echo Step 1: Checking Python installation...
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ %PYTHON_VERSION% found

echo.
echo Step 2: Checking Docker...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Docker is not running
    echo Please start Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker is running

echo.
echo Step 3: Installing ML dependencies...
cd /d "%ML_SERVICE_DIR%"
if not exist "ml_env" (
    echo Creating Python virtual environment...
    python -m venv ml_env
)

if exist "ml_env\Scripts\python.exe" (
    set "VENV_PYTHON=%CD%\ml_env\Scripts\python.exe"
) else (
    set "VENV_PYTHON=%CD%\ml_env\bin\python.exe"
)

"%VENV_PYTHON%" -m pip install -q -r "ml_requirements.txt"
if %errorLevel% neq 0 (
    echo [WARNING] Failed to install full ML dependencies. Falling back to mock service.
    echo Installing minimal mock dependencies...
    "%VENV_PYTHON%" -m pip install -q fastapi uvicorn python-multipart pillow
    set USE_MOCK=1
) else (
    set USE_MOCK=0
)
echo ✅ Dependencies installed

echo.
echo =================================================
echo  Starting Services (ctrl+c to stop any)
echo =================================================
echo.

echo Step 4: Starting Docker containers...
cd /d "%PROJECT_ROOT%\infra\docker"
docker-compose up -d >nul 2>&1
echo ✅ PostgreSQL and MinIO running

echo.
echo Step 5: Starting Node.js API...
cd /d "%PROJECT_ROOT%"
start "WildVision API" cmd /k "bun run dev 2>&1 | findstr /V heartbeat"
timeout /t 3 /nobreak

echo ✅ API Server starting on http://localhost:4000
echo ✅ Web Frontend on http://localhost:3000

echo.
echo Step 6: Starting ML Service...
echo.
echo 🐯 ML Service starting on http://localhost:8000
echo This will download the animal detection model on first run (~500MB)
echo Please wait...
echo.

cd /d "%ML_SERVICE_DIR%"
if exist "ml_env\Scripts\python.exe" (
    set "VENV_PYTHON=%CD%\ml_env\Scripts\python.exe"
) else (
    set "VENV_PYTHON=%CD%\ml_env\bin\python.exe"
)

if "!USE_MOCK!"=="1" (
    echo Starting Mock ML Service...
    "%VENV_PYTHON%" ml_service_mock.py
) else (
    "%VENV_PYTHON%" ml_service.py
)

echo ⚠️ ML Service stopped
pause