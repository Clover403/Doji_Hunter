@echo off
title DojiHunter AI Trading Bot Server
color 0A

::==================================================
::   DOJIHUNTER AI TRADING BOT - SERVER STARTUP
::==================================================

echo [%date% %time%] Starting DojiHunter Backend Server...
cd /d "%~dp0backend"
start "DojiHunter Backend" /min /D "DojiHunter Backend" cmd /c "node index.js"

echo [%date% %time%] Backend started in minimized window

echo [%date% %time%] Starting MT5 Bridge Server...
cd /d "%~dp0mt5_bridge"
start "MT5 Bridge" /min /D "MT5 Bridge" cmd /c "python server.py"

echo [%date% %time%] MT5 Bridge started in minimized window

echo.
echo ========================================
echo DojiHunter Server Started!
echo ========================================
echo Backend: http://localhost:3000
echo MT5 Bridge: http://localhost:5000
echo Access: http://localhost:5173 (Frontend)
echo.
echo Servers running in background...
echo Close this window to stop servers.
echo ========================================
echo.

timeout /t 5 /nobreak >nul
:: Minimize this window after startup
powershell -Command "& {Add-Type -Name WinAPI -Namespace System -Member Function SetForegroundWindow -Parameter IntPtr} [WinAPI]::SetForegroundWindow((Get-Process -Name 'cmd').MainWindowHandle)}"

pause
