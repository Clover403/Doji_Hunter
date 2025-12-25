const express = require('express');
const cors = require('cors');
console.log("INDEX.JS STARTED");
const { runAnalysis } = require('./src/services/tradingService');
const { sequelize, AiAnalysis, AiModelResult, Order } = require('./models');
const mt5Service = require('./src/services/mt5Service');
require('dotenv').config();

// Global error handlers to prevent crash
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const SYMBOLS = ['BTCUSD', 'ETHUSD'];
const TIMEFRAME = 'M15'; 
const INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

// ===================== API ENDPOINTS =====================

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'DojiHunter AI Trading Bot is Running',
    timestamp: new Date().toISOString()
  });
});

// Get Bot Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    symbols: SYMBOLS,
    timeframe: TIMEFRAME,
    interval_seconds: INTERVAL_MS / 1000,
    timestamp: new Date().toISOString()
  });
});

// Get All Analyses
app.get('/api/analyses', async (req, res) => {
  try {
    const { limit = 50, offset = 0, symbol } = req.query;
    const where = symbol ? { symbol } : {};
    
    const analyses = await AiAnalysis.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: AiModelResult, as: 'modelResults' },
        { model: Order, as: 'orders' }
      ]
    });
    
    res.json({
      total: analyses.count,
      data: analyses.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Analysis
app.get('/api/analyses/:id', async (req, res) => {
  try {
    const analysis = await AiAnalysis.findByPk(req.params.id, {
      include: [
        { model: AiModelResult, as: 'modelResults' },
        { model: Order, as: 'orders' }
      ]
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Orders
app.get('/api/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0, symbol, result } = req.query;
    const where = {};
    if (symbol) where.symbol = symbol;
    if (result) where.result = result;
    
    const orders = await Order.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      total: orders.count,
      data: orders.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI Model Results
app.get('/api/model-results', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const results = await AiModelResult.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      total: results.count,
      data: results.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalAnalyses = await AiAnalysis.count();
    const dojiDetected = await AiAnalysis.count({ where: { is_doji_detected: true } });
    const totalOrders = await Order.count();
    const openOrders = await Order.count({ where: { result: 'OPEN' } });
    const wonOrders = await Order.count({ where: { result: 'WON' } });
    const lostOrders = await Order.count({ where: { result: 'LOST' } });
    
    // Recent analyses
    const recentAnalyses = await AiAnalysis.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ model: AiModelResult, as: 'modelResults' }]
    });
    
    // Recent orders
    const recentOrders = await Order.findAll({
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    res.json({
      stats: {
        totalAnalyses,
        dojiDetected,
        dojiPercentage: totalAnalyses > 0 ? ((dojiDetected / totalAnalyses) * 100).toFixed(2) : 0,
        totalOrders,
        openOrders,
        wonOrders,
        lostOrders,
        winRate: (wonOrders + lostOrders) > 0 ? ((wonOrders / (wonOrders + lostOrders)) * 100).toFixed(2) : 0
      },
      recentAnalyses,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Candles from MT5
app.get('/api/candles', async (req, res) => {
  try {
    const { symbol = 'BTCUSD', timeframe = 'M15', count = 20 } = req.query;
    const candles = await mt5Service.getCandles(symbol, timeframe, parseInt(count));
    res.json(candles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Analysis Trigger
app.post('/api/analyze', async (req, res) => {
  try {
    const { symbol, timeframe = TIMEFRAME } = req.body;
    
    if (symbol) {
      await runAnalysis(symbol, timeframe);
      res.json({ message: `Analysis triggered for ${symbol}`, symbol, timeframe });
    } else {
      // Run for all symbols
      for (const s of SYMBOLS) {
        await runAnalysis(s, timeframe);
      }
      res.json({ message: 'Analysis triggered for all symbols', symbols: SYMBOLS, timeframe });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Configuration
app.get('/api/config', (req, res) => {
  res.json({
    symbols: SYMBOLS,
    timeframe: TIMEFRAME,
    interval_ms: INTERVAL_MS,
    min_confidence: 0.75
  });
});

// Start Initialization
let server;

const startServer = async () => {
  console.log('DB_NAME in index.js:', process.env.DB_NAME);
  try {
    console.log('Running Database Sync...');
    // await sequelize.sync({ force: true }); 
    console.log('Database synced successfully (Manual).');

    // Safe analysis runner
    const safeRunAnalysis = async (sym, tf) => {
      try {
        await runAnalysis(sym, tf);
      } catch (err) {
        console.error(`Analysis error for ${sym}:`, err.message);
      }
    };

    // Start Server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start Loop
      console.log(`Starting Trading Loop for ${SYMBOLS.join(', ')} on ${TIMEFRAME} every ${INTERVAL_MS/1000}s`);

      // Initial run
      SYMBOLS.forEach(sym => safeRunAnalysis(sym, TIMEFRAME));

      // Scheduled run
      setInterval(() => {
        console.log('Running scheduled analysis...');
        SYMBOLS.forEach(sym => safeRunAnalysis(sym, TIMEFRAME));
      }, INTERVAL_MS);
    });
    
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

startServer();
