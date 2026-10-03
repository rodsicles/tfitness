@echo off
cd /d "%~dp0"
if not exist "node_modules\next\dist\bin\next" (
  echo Dependencies are missing. Run install-dependencies.cmd first.
  pause
  exit /b 1
)
node node_modules\next\dist\bin\next dev --hostname 127.0.0.1
pause
