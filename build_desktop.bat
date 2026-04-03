@echo off
echo ==========================================
echo   Himo AI Assistant - Desktop Build Tool
echo ==========================================
echo.
echo [1/3] Installing local dependencies...
call npm install

echo.
echo [2/3] Building web assets...
call npm run build

echo.
echo [3/3] Packaging into Desktop App (.exe)...
call npx electron-builder --win --portable

echo.
echo ==========================================
echo   Build Complete! Check the 'dist_electron' folder.
echo ==========================================
pause
