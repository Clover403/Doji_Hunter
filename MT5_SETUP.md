# Connecting MetaTrader 5 to DojiHunter

Since MetaTrader 5 (MT5) is a Windows-only application and this backend is designed to be flexible (running on Linux/Cloud), we use a **Python Bridge** architecture.

## Prerequisites

1.  **Windows Machine/VPS**: You must have a computer running Windows where your MT5 terminal is installed and logged in.
2.  **Python 3.x**: Installed on that Windows machine.
3.  **Network Access**: The Windows machine must be accessible from where you run the Node.js backend (ensure port 5000 is open in Windows Firewall).

## Step-by-Step Guide

### 1. Set up the Bridge on Windows

1.  Copy the `mt5_bridge` folder from this project to your Windows machine.
2.  Open Command Prompt (cmd) or PowerShell on Windows inside that folder.
3.  Install the required Python packages:
    ```bash
    pip install Flask MetaTrader5
    ```
4.  Start the bridge server:
    ```bash
    python server.py
    ```
    *You should see a message saying it's running on http://0.0.0.0:5000*

### 2. Verify MT5 Connection

-   Ensure your MT5 terminal is **open** and **logged in** to your trading account on the Windows machine.
-   The Python script will attempt to connect to the running MT5 terminal automatically.
-   Check the console output for "MT5 initialized".

### 3. Configure the Node.js Backend

1.  Find the **IP Address** of your Windows machine (e.g., run `ipconfig` in cmd). Let's say it is `192.168.1.100`.
2.  On your Linux/Node.js server, open the `.env` file.
3.  Update `MT5_BRIDGE_URL` to point to your Windows machine:
    ```ini
    MT5_BRIDGE_URL=http://192.168.1.100:5000
    ```
4.  Restart the Node.js application:
    ```bash
    node index.js
    ```

## Troubleshooting

-   **"Failed to connect"**: Check Windows Firewall settings. Ensure Inbound Rules allow TCP traffic on port 5000.
-   **"initialize() failed"**: Make sure MT5 is running and "AutoTrading" is enabled in the terminal (though the API usually works without AutoTrading button for data, but needs it for orders).
-   **"Symbol not found"**: Ensure the symbol (e.g., EURUSD) is visible in the Market Watch window in MT5.
