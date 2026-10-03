@echo off
cd /d "%~dp0"
node "%USERPROFILE%\node_modules\npm\bin\npm-cli.js" install --no-audit --no-fund
if errorlevel 1 (
  echo Installation failed. See the error above.
  pause
  exit /b 1
)
echo Gym dependencies are installed.
pause
