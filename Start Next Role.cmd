@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if not exist "workspace\dashboard.html" goto build
if /i "%~1"=="--no-open" goto show
start "" "%~dp0workspace\dashboard.html"
exit /b %errorlevel%

:show
echo "%~dp0workspace\dashboard.html"
exit /b 0

:build
call scripts\run-node.cmd scripts\launch.mjs %*
set "result=%errorlevel%"
if not "%result%"=="0" if "%~1"=="" pause
exit /b %result%
