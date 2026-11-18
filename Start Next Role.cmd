@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Next Role needs Node.js 20 or newer. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)
node scripts\launch.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
