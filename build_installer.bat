@echo off
echo Building Himo AI Desktop Installer...
npm run build
echo Packaging with electron-builder...
npx electron-builder --win nsis
echo Done! Check dist_electron folder for the installer.
pause
