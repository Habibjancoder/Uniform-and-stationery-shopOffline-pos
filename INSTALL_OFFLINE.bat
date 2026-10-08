@echo off
title KitabGhar POS - First Time Setup & Offline Build
color 0B
cls

echo ===============================================================================
echo            KITABGHAR POS - FIRST TIME SETUP & OFFLINE COMPILATION
echo ===============================================================================
echo.
echo Is script k zariye app ki tamam zaroori files ek martaba install aur build ho jayengi,
echo ta k aap mustaqbil main bina internet ek second main POS chala sakein.
echo.
echo [Step 1] Installing packages...
call npm install
echo.
echo [Step 2] Building offline production application...
call npm run build
echo.
echo ===============================================================================
echo [SUCCESS] Setup mukammal ho gaya!
echo Ab aap hamesha "RUN_KITABGHAR_OFFLINE.bat" par double click karke POS chala sakte hain!
echo ===============================================================================
pause
