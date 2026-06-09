@echo off

setlocal EnableExtensions

cd /d "%~dp0"



echo.

echo  ========================================

echo   OmniParse - One-Click Launcher

echo  ========================================

echo.



where cargo >nul 2>&1

if errorlevel 1 (

    echo [ERROR] Rust/Cargo is not installed or not on PATH.

    echo Install Rust from https://rustup.rs/

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

echo.



start "OmniParse Backend" cmd /k "%~dp0scripts\run-backend.bat"

timeout /t 2 /nobreak >nul

start "OmniParse Frontend" cmd /k "%~dp0scripts\run-frontend.bat"



echo.

echo Two terminal windows were opened for the backend and frontend.

echo Close those windows to stop OmniParse.

echo.

pause


