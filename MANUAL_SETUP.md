# 🖥️ DOJIHUNTER 24/7 SERVER SETUP GUIDE

## ✅ **COMPLETED SETUP**

### 🔧 **1. Power Configuration** - ✅ DONE
- Power plan: High Performance
- Sleep/hibernate: Disabled  
- Monitor timeout: Disabled
- Wake timers: Enabled
- **Result**: Laptop will NOT sleep when lid closed, servers keep running!

### 🚀 **2. Scripts Created** - ✅ AVAILABLE
- `start_server.bat` - Start both servers
- `server_monitor.vbs` - Auto-restart if servers crash
- Desktop shortcut - Easy start
- `power_config.bat` - Power settings (already run)

## 📋 **MANUAL SETUP STEPS**

### 🔴 **STEP 1: Run as Administrator (Auto-Start)**
```powershell
# Open PowerShell as Administrator
# Run this command:
powershell -ExecutionPolicy Bypass -File "C:\Users\Wali Qowi\OneDrive\Documents\VScodeFOLDER\Doji_Hunter\setup_autostart.ps1"
```

### 🟢 **STEP 2: Test Manual Start**
```batch
# Run this to test:
C:\Users\Wali Qowi\OneDrive\Documents\VScodeFOLDER\Doji_Hunter\start_server.bat
```

### 🟡 **STEP 3: Start Monitor for Auto-Recovery**
```vbs
# Run this (optional):
wscript "C:\Users\Wali Qowi\OneDrive\Documents\VScodeFOLDER\Doji_Hunter\server_monitor.vbs"
```

## 🔧 **FILES CREATED FOR YOU**

| File | Purpose | Location |
|------|---------|----------|
| `start_server.bat` | Start both servers | Project root |
| `server_monitor.vbs` | Auto-restart crashed servers | Project root |
| `DojiHunter Server.lnk` | Desktop shortcut | Desktop |
| `setup_autostart.ps1` | Windows Task Scheduler setup | Project root |
| `power_config.bat` | Power configuration | Project root |

## 🎯 **HOW TO USE**

### **🖥️ FOR 24/7 SERVER OPERATION:**

**Option 1: Auto-Start (Recommended)**
1. Right-click PowerShell → "Run as administrator"
2. Run: `setup_autostart.ps1`
3. Log out and log back in → servers start automatically

**Option 2: Manual Start**
1. Double-click "DojiHunter Server" on desktop
2. Keep computer plugged in
3. Monitor: `server_monitor.vbs`

## 🌐 **ACCESS YOUR SERVER**

### **Backend API:** http://localhost:3000
### **MT5 Bridge:** http://localhost:5000  
### **Frontend:** http://localhost:5173

## ⚡ **SERVER ARCHITECTURE**

```
🖥️ Laptop (Power On/Login) 
    ↓
🚀 DojiHunter Auto-Start
    ↓
💻 Backend Server (Node.js, Port 3000)
    ↓
🔌 MT5 Bridge (Python, Port 5000)
    ↓
🤖 MT5 Terminal (Real Trading Data)
    ↓
🌐 Web Interface (Port 5173)
    ↓
📊 Your Dashboard with Live Trading
```

## 🔧 **TROUBLESHOOTING**

### **❌ If servers won't start:**
1. Check if Node.js installed: `node --version`
2. Check if Python installed: `python --version`  
3. Check if MT5 terminal open
4. Run manual: `start_server.bat`

### **❌ If servers stop working when lid closed:**
1. Run: `power_config.bat`
2. Check Windows power settings
3. Ensure laptop plugged in

### **❌ If servers crash:**
1. Run: `server_monitor.vbs` 
2. Log file: `server_monitor.log`
3. Check for errors in Node.js/Python

## 🎯 **FINAL VERIFICATION**

After setup, verify these URLs work:
- ✅ http://localhost:3000 (Backend health)
- ✅ http://localhost:5000/health (MT5 Bridge health)
- ✅ http://localhost:5173 (Frontend UI)

**SUCCESS = DojiHunter running 24/7 on your laptop!** 🎉
