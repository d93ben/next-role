@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
call scripts\run-node.cmd scripts\launch.mjs %*
set "result=%errorlevel%"
if not "%result%"=="0" if "%~1"=="" pause
exit /b %result%
