@echo off
echo Starting DojiHunter Backend...
cd /d "%~dp0backend"
start "DojiHunter Backend" cmd /k node index.js
echo Backend started!

echo Starting DojiHunter Frontend...
cd /d "%~dp0frontend"
start "DojiHunter Frontend" cmd /k npm run dev
echo Frontend started!

echo.
echo DojiHunter is starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
pause
