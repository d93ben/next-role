@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NEXT_ROLE_MANIFEST=%~dp0node-runtime.txt"
set "NEXT_ROLE_VERSION="
for /f "usebackq tokens=1" %%V in ("%NEXT_ROLE_MANIFEST%") do if not defined NEXT_ROLE_VERSION set "NEXT_ROLE_VERSION=%%V"
set "NEXT_ROLE_ARCH=%PROCESSOR_ARCHITECTURE%"
if defined PROCESSOR_ARCHITEW6432 set "NEXT_ROLE_ARCH=%PROCESSOR_ARCHITEW6432%"
set "NEXT_ROLE_TARGET="
if /I "%NEXT_ROLE_ARCH%"=="AMD64" set "NEXT_ROLE_TARGET=win-x64"
if /I "%NEXT_ROLE_ARCH%"=="ARM64" set "NEXT_ROLE_TARGET=win-arm64"
for %%D in ("%~dp0..\.next-role-runtime") do set "NEXT_ROLE_RUNTIME=%%~fD"
set "NEXT_ROLE_DIST=node-v%NEXT_ROLE_VERSION%-%NEXT_ROLE_TARGET%"
set "NEXT_ROLE_NODE=%NEXT_ROLE_RUNTIME%\%NEXT_ROLE_DIST%\node.exe"
if defined NEXT_ROLE_TARGET if exist "%NEXT_ROLE_NODE%" goto local

node.exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>&1
if not errorlevel 1 goto system
if not defined NEXT_ROLE_TARGET (
  echo Next Role can download portable Node for 64-bit Windows x64 or Arm64. This machine needs an existing Node.js 20 or newer. 1>&2
  exit /b 1
)

powershell.exe -NoProfile -NonInteractive -Command ^
  "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ^
  "$dist = $env:NEXT_ROLE_DIST; $name = $dist + '.zip'; $runtime = $env:NEXT_ROLE_RUNTIME;" ^
  "$entry = Get-Content -LiteralPath $env:NEXT_ROLE_MANIFEST | Where-Object { $_ -match ('^[a-f0-9]{64}\s+' + [regex]::Escape($name) + '$') } | Select-Object -First 1;" ^
  "if (-not $entry) { throw 'Missing portable Node checksum.' }; $expected = ($entry -split '\s+')[0];" ^
  "[IO.Directory]::CreateDirectory($runtime) | Out-Null; $staging = Join-Path $runtime ('.download-' + [guid]::NewGuid().ToString('N'));" ^
  "[IO.Directory]::CreateDirectory($staging) | Out-Null;" ^
  "try { $archive = Join-Path $staging $name; [Console]::Error.WriteLine('Downloading portable Node.js ' + $env:NEXT_ROLE_VERSION + ' into the Next Role folder.');" ^
  "$url = 'https://nodejs.org/dist/v' + $env:NEXT_ROLE_VERSION + '/' + $name; & curl.exe --fail --location --proto '=https' --max-time 120 --silent --show-error --output $archive $url; if ($LASTEXITCODE -ne 0) { throw 'Portable Node download failed.' };" ^
  "$hash = [Security.Cryptography.SHA256]::Create(); $stream = [IO.File]::OpenRead($archive); try { $actual = [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-', '') } finally { $stream.Dispose(); $hash.Dispose() };" ^
  "if ($actual -ne $expected) { throw 'The portable Node download did not match its SHA-256 checksum.' };" ^
  "& tar.exe -xf $archive -C $staging ($dist + '/node.exe') ($dist + '/LICENSE'); if ($LASTEXITCODE -ne 0) { throw 'Could not extract the portable Node archive.' };" ^
  "$source = (Resolve-Path -LiteralPath (Join-Path $staging $dist)).ProviderPath; $destination = [IO.Path]::GetFullPath((Join-Path $runtime $dist));" ^
  "if ([IO.Path]::GetDirectoryName($source) -ne $staging -or [IO.Path]::GetDirectoryName($destination) -ne $runtime) { throw 'Unexpected runtime paths.' };" ^
  "try { [IO.Directory]::Move($source, $destination) } catch { if (-not (Test-Path -LiteralPath $env:NEXT_ROLE_NODE -PathType Leaf)) { throw } }" ^
  "} finally { $resolved = (Resolve-Path -LiteralPath $staging -ErrorAction SilentlyContinue).ProviderPath; if ($resolved -eq $staging -and [IO.Path]::GetDirectoryName($resolved) -eq $runtime) { Remove-Item -LiteralPath $resolved -Recurse -Force } }"
if errorlevel 1 (
  echo Portable setup needs access to nodejs.org on the first run. Try again with a connection, or open workspace\dashboard.html if it is already built. 1>&2
  exit /b 1
)

:local
"%NEXT_ROLE_NODE%" %*
exit /b %errorlevel%

:system
node.exe %*
exit /b %errorlevel%
