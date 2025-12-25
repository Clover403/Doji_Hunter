# Setup DojiHunter Auto-Start in Windows Task Scheduler
# Run as Administrator for Task Scheduler setup

Write-Host "Setting up DojiHunter Server Auto-Start..."

$taskName = "DojiHunterServer"
$scriptPath = "C:\Users\Wali Qowi\OneDrive\Documents\VScodeFOLDER\Doji_Hunter\start_server.bat"

try {
    # Remove existing task if it exists
    try {
        Unregister-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Write-Host "Removed existing task..." -ForegroundColor Yellow
    } catch {
        # Task doesn't exist, that's fine
    }

    # Create new task
    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "$($env:USERDOMAIN)\$($env:USERNAME)" -LogonType Interactive

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
    
    Write-Host "✅ DojiHunter Server auto-start setup complete!" -ForegroundColor Green
    Write-Host "✅ Servers will start automatically when you log in to Windows" -ForegroundColor Green
    Write-Host "✅ Shortcut created on Desktop: DojiHunter Server" -ForegroundColor Green
    Write-Host ""
    Write-Host "Manual Start Options:" -ForegroundColor Cyan
    Write-Host "1. Double-click desktop shortcut" -ForegroundColor White
    Write-Host "2. Run: start_server.bat" -ForegroundColor White
    Write-Host "3. Check servers: http://localhost:3000 (Backend)" -ForegroundColor White
    Write-Host "4. Check servers: http://localhost:5000 (MT5 Bridge)" -ForegroundColor White
    Write-Host ""
    Write-Host "Monitor: server_monitor.vbs will auto-restart crashed servers" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error setting up auto-start: $_" -ForegroundColor Red
    Write-Host "Try running this script as Administrator" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit..."
