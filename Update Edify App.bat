@echo off
setlocal
cd /d "%~dp0App"

echo Building Edify app...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Updating unpacked Windows app without rebuilding the installer...
call node_modules\.bin\electron-builder.cmd --win dir
if errorlevel 1 (
  echo Unpacked app update failed.
  pause
  exit /b 1
)

echo Launching Edify...
start "" "%~dp0App\release\win-unpacked\Edify.exe"
