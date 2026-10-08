@echo off
title KitabGhar POS & Uniform ERP - Offline Desktop Runner
color 0A
cls

echo ===============================================================================
echo            KITABGHAR POS & UNIFORM ERP - 100%% OFFLINE WINDOWS RUNNER
echo      (Baghair Internet & Baghair Gemini API Key k Direct Chalane Ka Script)
echo ===============================================================================
echo.
echo [1/3] Node.js Runtime Check...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Node.js is not installed on this computer!
    echo Node.js download aur install karne k liye is link par jayein:
    echo https://nodejs.org
    echo.
    echo Note: LTS version download karke install karein, phir is file par dobara double-click karein.
    echo.
    pause
    exit /b
)

echo [OK] Node.js is detected.
echo.

echo [2/3] Checking Dependencies & Local Server...
if not exist "node_modules" (
    echo [INFO] First time launch detected. Installing required packages...
    call npm install
)

echo.
echo [3/3] Launching KitabGhar POS Offline...
echo Address: http://localhost:3000
echo Offline Storage: Local SQLite & IndexedDB Active
echo Internet Required: NO (0%% Internet Needed)
echo Gemini API Key: NOT NEEDED (100%% Local Engine)
echo.

:: Automatically open browser after 2 seconds delay
start "" http://localhost:3000

echo ===============================================================================
echo Server is running! POS application aap k browser main open ho chuki hai.
echo Is black window ko band na karein jab tak aap POS use kar rahe hain.
echo Band karne k liye is window ko close kar dein.
echo ===============================================================================
echo.

if exist ".next" (
    call npm run start
) else (
    call npm run dev
)

pause
