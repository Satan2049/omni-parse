@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  ========================================
echo   OmniParse - One-Click Launcher
echo  ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not on PATH.
    echo Install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not on PATH.
    echo Install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available.
    pause
    exit /b 1
)

if not exist "backend\.venv\Scripts\activate.bat" (
    echo [SETUP] Creating Python virtual environment in backend\.venv ...
    python -m venv backend\.venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

call backend\.venv\Scripts\activate.bat

python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [SETUP] Installing Python packages...
    python -m pip install --upgrade pip
    pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] pip install failed.
        pause
        exit /b 1
    )
    echo [SETUP] Installing Playwright Chromium for optional JS rendering...
    playwright install chromium
    if errorlevel 1 (
        echo [WARN] Playwright browser install failed. Static pages will still work.
    )
) else (
    echo [OK] Python dependencies already installed - virtual environment activated.
)

call deactivate >nul 2>&1

if not exist "frontend\node_modules" (
    echo [SETUP] Installing Node packages...
    pushd frontend
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    popd
) else (
    echo [OK] Node dependencies already installed.
)

if not exist "frontend\.env.local" (
    if exist "frontend\.env.example" (
        copy /Y "frontend\.env.example" "frontend\.env.local" >nul
        echo [OK] Created frontend\.env.local
    )
)

echo.
echo [START] Launching OmniParse...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.

start "OmniParse Backend" cmd /k "%~dp0scripts\run-backend.bat"
timeout /t 2 /nobreak >nul
start "OmniParse Frontend" cmd /k "%~dp0scripts\run-frontend.bat"

echo.
echo Two terminal windows were opened for the backend and frontend.
echo Close those windows to stop OmniParse.
echo.
pause
