@echo off
REM OpenHamClock Update Script for Windows
REM Updates to the latest version while preserving your configuration

echo =========================================================
echo           OpenHamClock Update Script (Windows)
echo =========================================================
echo.

REM Must be run from the openhamclock directory
if not exist "server.js" (
    echo ERROR: Please run this script from the openhamclock directory
    echo   cd C:\path\to\openhamclock
    echo   scripts\update.bat
    pause
    exit /b 1
)
if not exist "package.json" (
    echo ERROR: package.json not found. Are you in the right directory?
    pause
    exit /b 1
)

REM Check git
where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: git is not installed or not on PATH
    echo   Download from https://git-scm.com/
    pause
    exit /b 1
)

REM Check Node
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not on PATH
    echo   Download from https://nodejs.org/
    pause
    exit /b 1
)

REM Save current version
for /f "tokens=2 delims=:, " %%v in ('findstr /r "\"version\"" package.json') do (
    set OLD_VERSION=%%~v
    goto :got_old_version
)
:got_old_version
set OLD_VERSION=%OLD_VERSION:"=%
echo Current version: %OLD_VERSION%
echo.

echo Backing up configuration...
if exist ".env" (
    copy /y .env .env.backup >nul
    echo   .env -^> .env.backup
)
if exist "config.json" (
    copy /y config.json config.json.backup >nul
    echo   config.json -^> config.json.backup
)
echo.

echo Pulling latest changes...
git pull
if errorlevel 1 (
    echo ERROR: git pull failed. Check your internet connection.
    pause
    exit /b 1
)
echo.

echo Installing dependencies...
call npm ci --ignore-scripts
if errorlevel 1 (
    echo WARNING: npm ci failed, trying npm install...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)
echo.

echo Building frontend...
if exist "dist" rmdir /s /q dist
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)
echo.

echo Restoring configuration...
if exist ".env.backup" (
    if not exist ".env" (
        copy /y .env.backup .env >nul
        echo   .env restored from backup
    )
)
if exist "config.json.backup" (
    if not exist "config.json" (
        copy /y config.json.backup config.json >nul
        echo   config.json restored from backup
    )
)

REM Get new version
for /f "tokens=2 delims=:, " %%v in ('findstr /r "\"version\"" package.json') do (
    set NEW_VERSION=%%~v
    goto :got_new_version
)
:got_new_version
set NEW_VERSION=%NEW_VERSION:"=%

echo.
if "%OLD_VERSION%"=="%NEW_VERSION%" (
    echo Version: %NEW_VERSION% (unchanged)
) else (
    echo Updated: %OLD_VERSION% -^> %NEW_VERSION%
)

echo.
echo =========================================================
echo                  Update Complete!
echo =========================================================
echo.
echo Restart the server to apply changes:
echo   npm start
echo.
pause
