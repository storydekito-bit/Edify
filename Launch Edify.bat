@echo off
setlocal
set "APP_EXE=%~dp0App\release\win-unpacked\Edify.exe"

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
  exit /b 0
)

echo Edify.exe was not found.
echo Run "Update Edify App.bat" first to build the unpacked app.
pause
