const express = require('express');
console.log("INDEX.JS STARTED");
const { runAnalysis } = require('./src/services/tradingService');
const { sequelize } = require('./models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD'];
const TIMEFRAME = 'M15'; 
const INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

// Health Check
app.get('/', (req, res) => {
  res.send('DojiHunter AI Trading Bot is Running');
});

// Manual Trigger Endpoint (for testing)
app.get('/analyze', async (req, res) => {
  const { symbol } = req.query;
  if (symbol) {
    runAnalysis(symbol, TIMEFRAME);
    res.send(`Analysis triggered for ${symbol}`);
  } else {
    // Run for all
    for (const s of SYMBOLS) {
      await runAnalysis(s, TIMEFRAME);
    }
    res.send('Analysis triggered for all symbols');
  }
});

// Start Initialization
(async () => {
  console.log('DB_NAME in index.js:', process.env.DB_NAME);
  try {
    console.log('Running Database Sync...');
    // await sequelize.sync({ force: true }); 
    console.log('Database synced successfully (Manual).');

    // Start Server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start Loop
      console.log(`Starting Trading Loop for ${SYMBOLS.join(', ')} on ${TIMEFRAME} every ${INTERVAL_MS/1000}s`);
      
      // Initial run
      SYMBOLS.forEach(sym => runAnalysis(sym, TIMEFRAME));

      // Scheduled run
      setInterval(() => {
        SYMBOLS.forEach(sym => runAnalysis(sym, TIMEFRAME));
      }, INTERVAL_MS);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
