@echo off
setlocal
cd /d "%~dp0App"
call npm.cmd run dev
