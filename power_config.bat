@echo off
title Power Configuration for Server
color 0E

echo Configuring Windows Power Settings for 24/7 Server Operation...
echo.

REM Configure power plan for high performance
powercfg /setactive scheme_min
echo ✅ Set power plan to High Performance

REM Disable sleep/hibernate
powercfg /change standby-timeout 0
powercfg /change hibernate-timeout 0
powercfg /change monitor-timeout 0
echo ✅ Disabled sleep and hibernate

REM Allow wake timers
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0
echo ✅ Configured AC power settings

REM Configure wake timers
powercfg /change wake-timers
echo ✅ Enabled wake timers

REM Disable hybrid sleep
powercfg /change hibernate-type off
echo ✅ Disabled hybrid sleep

echo.
echo ========================================
echo Power Configuration Complete!
echo ========================================
echo ⚠️  Laptop will NOT sleep when lid is closed
echo ⚠️  Screen may turn off but servers keep running
echo ⚠️  Battery will drain faster when on battery
echo ========================================
echo.
echo Press any key to continue...
pause >nul
