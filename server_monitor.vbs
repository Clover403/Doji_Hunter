' DojiHunter Server Monitor
' Auto-restart servers if they crash

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Do While True
    ' Check Backend Server
    If Not IsProcessRunning("node.exe", "DojiHunter Backend") Then
        LogMessage "Backend server crashed, restarting..."
        shell.CurrentDirectory = fso.GetParentFolder(WScript.ScriptFullName) & "\backend"
        shell.Run "cmd /c node index.js", 0, False
        WScript.Sleep 3000 ' Wait 3 seconds for startup
    End If
    
    ' Check MT5 Bridge Server
    If Not IsProcessRunning("python.exe", "server.py") Then
        LogMessage "MT5 Bridge crashed, restarting..."
        shell.CurrentDirectory = fso.GetParentFolder(WScript.ScriptFullName) & "\mt5_bridge"
        shell.Run "cmd /c python server.py", 0, False
        WScript.Sleep 3000 ' Wait 3 seconds for startup
    End If
    
    LogMessage "Servers running normally. Checking again in 60 seconds..."
    WScript.Sleep 60000 ' Check every minute
Loop

Function IsProcessRunning(processName, windowTitle)
    On Error Resume Next
    
    ' Check by process name and title
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Set processes = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name LIKE '%" & processName & "%'")
    
    For Each process In processes
        processId = process.ProcessId
        Set processItems = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE ProcessId=" & processId)
        
        For Each item In processItems
            commandLine = item.CommandLine
            If InStr(1, LCase(commandLine), "node index.js") > 0 Or InStr(1, LCase(commandLine), "server.py") > 0 Then
                IsProcessRunning = True
                Exit Function
            End If
        Next
    Next
    
    IsProcessRunning = False
End Function

Sub LogMessage(message)
    LogFile = fso.BuildPath(fso.GetParentFolder(WScript.ScriptFullName), "server_monitor.log")
    Set fileLog = fso.OpenTextFile(LogFile, 8, True)
    fileLog.WriteLine "[" & Now & "] " & message
    fileLog.Close
End Sub
