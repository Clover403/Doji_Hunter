// MUST be first - load environment variables before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
console.log("INDEX.JS STARTED");
const { 
  runAnalysis, 
  getConfig, 
  getAvailableOptions,
  checkTradingReadiness,
  getActivePositions,
  getHistoricalOrders,
  syncOrdersWithMT5,
  closeAllPositions,
  getOpenOrderCount,
  canOpenNewOrder
} = require('./src/services/tradingService');
const { sequelize, AiAnalysis, AiModelResult, Order } = require('./models');

// Use mock MT5 if configured
const useMockMT5 = process.env.USE_MOCK_MT5 === 'true';
console.log('🔧 USE_MOCK_MT5:', process.env.USE_MOCK_MT5, '-> Mock mode:', useMockMT5);
const mt5Service = useMockMT5 
  ? require('./src/services/mt5Service.mock')
  : require('./src/services/mt5Service');

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

// Runtime Configuration (can be changed via API)
const CONFIG_FILE = path.join(__dirname, 'runtime-config.json');

// Load or create default config
const loadRuntimeConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Failed to load runtime config, using defaults');
  }
  return {
    symbols: (process.env.TRADING_SYMBOLS || 'BTCUSD,ETHUSD').split(','),
    timeframe: process.env.TRADING_TIMEFRAME || 'M15',
    interval_seconds: parseInt(process.env.TRADING_INTERVAL || '900'),
    enabled: true
  };
};

const saveRuntimeConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save runtime config:', e.message);
    return false;
  }
};

// Initialize runtime config
let runtimeConfig = loadRuntimeConfig();
console.log('Runtime Config:', runtimeConfig);

// ===================== API ENDPOINTS =====================

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'DojiHunter AI Trading Bot is Running',
    timestamp: new Date().toISOString()
  });
});

/**
 * =============================================================================
 * TRADING HEALTH CHECK - CRITICAL ENDPOINT
 * =============================================================================
 * Verifies that the system is ready for REAL trading:
 * - MT5 connected
 * - Account logged in
 * - Trading allowed
 * - Can fetch positions
 */
app.get('/api/health/trading', async (req, res) => {
  try {
    const health = await checkTradingReadiness();
    const statusCode = health.ready ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({ 
      ready: false, 
      error: error.message,
      message: 'Failed to check trading health'
    });
  }
});

/**
 * =============================================================================
 * ACTIVE POSITIONS - FROM MT5 (SOURCE OF TRUTH)
 * =============================================================================
 * Returns LIVE positions from MetaTrader 5.
 * If a position is not here, it does NOT exist.
 */
app.get('/api/positions/active', async (req, res) => {
  try {
    const positions = await getActivePositions();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      positions: []
    });
  }
});

/**
 * =============================================================================
 * HISTORICAL ORDERS - FROM DATABASE
 * =============================================================================
 * Returns historical order records from database.
 * These are NOT live positions - just records of past trades.
 */
app.get('/api/orders/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await getHistoricalOrders(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * =============================================================================
 * SYNC ORDERS WITH MT5
 * =============================================================================
 * Synchronizes database order status with MT5 positions.
 * Marks orders as closed if they no longer exist in MT5.
 */
app.post('/api/orders/sync', async (req, res) => {
  try {
    const result = await syncOrdersWithMT5();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * =============================================================================
 * CLOSE ALL DOJIHUNTER POSITIONS
 * =============================================================================
 * Emergency close all positions opened by DojiHunter bot.
 */
app.post('/api/orders/close-all', async (req, res) => {
  try {
    const reason = req.body?.reason || 'Manual close all via API';
    const result = await closeAllPositions(reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * =============================================================================
 * GET OPEN ORDER COUNT
 * =============================================================================
 * Returns count of DojiHunter orders currently open in MT5.
 */
app.get('/api/orders/count', async (req, res) => {
  try {
    const result = await getOpenOrderCount();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * =============================================================================
 * CHECK IF CAN OPEN NEW ORDER
 * =============================================================================
 * Checks if system can open new order (respects max order limit).
 */
app.get('/api/orders/can-open', async (req, res) => {
  try {
    const result = await canOpenNewOrder();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * =============================================================================
 * CLEAR DATABASE (Development only)
 * =============================================================================
 */
app.post('/api/admin/clear-database', async (req, res) => {
  try {
    // Delete all records
    await Order.destroy({ where: {}, truncate: true });
    await AiModelResult.destroy({ where: {}, truncate: true });
    await AiAnalysis.destroy({ where: {}, truncate: true });
    
    res.json({ 
      success: true, 
      message: 'Database cleared successfully',
      note: 'All orders, analyses, and model results deleted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Bot Status
app.get('/api/status', (req, res) => {
  const config = getConfig();
  res.json({
    status: runtimeConfig.enabled ? 'running' : 'paused',
    symbols: runtimeConfig.symbols,
    timeframe: runtimeConfig.timeframe,
    interval_seconds: runtimeConfig.interval_seconds,
    aiServiceAvailable: config.aiServiceAvailable,
    useMockAI: config.useMockAI,
    useMockMT5: config.useMockMT5,
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

/**
 * =============================================================================
 * GET ALL ORDERS
 * =============================================================================
 * Returns orders with clear distinction between:
 * - active: Live positions from MT5 (source of truth)
 * - history: Historical records from database
 */
app.get('/api/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0, symbol, result, source } = req.query;
    
    // If requesting active orders, get from MT5
    if (source === 'active' || result === 'OPEN') {
      const activePositions = await getActivePositions();
      return res.json({
        source: activePositions.source,
        total: activePositions.count || activePositions.positions.length,
        data: activePositions.positions,
        note: 'Active positions from MT5 (source of truth)'
      });
    }
    
    // Otherwise return historical orders from database
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
      source: 'database_history',
      total: orders.count,
      data: orders.rows,
      note: 'Historical orders from database'
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
    const { symbol, timeframe } = req.body;
    const tf = timeframe || runtimeConfig.timeframe;
    
    if (symbol) {
      await runAnalysis(symbol, tf);
      res.json({ message: `Analysis triggered for ${symbol}`, symbol, timeframe: tf });
    } else {
      // Run for all configured symbols
      for (const s of runtimeConfig.symbols) {
        await runAnalysis(s, tf);
      }
      res.json({ message: 'Analysis triggered for all symbols', symbols: runtimeConfig.symbols, timeframe: tf });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Configuration
app.get('/api/config', (req, res) => {
  const serviceConfig = getConfig();
  res.json({
    ...runtimeConfig,
    min_confidence: serviceConfig.minConfidence,
    aiServiceAvailable: serviceConfig.aiServiceAvailable,
    useMockAI: serviceConfig.useMockAI,
    useMockMT5: serviceConfig.useMockMT5
  });
});

// Update Configuration
app.post('/api/config', (req, res) => {
  try {
    const { symbols, timeframe, interval_seconds, enabled } = req.body;
    
    // Validate timeframe
    const availableOptions = getAvailableOptions();
    const validTimeframes = availableOptions.timeframes.map(t => t.value);
    const validSymbols = availableOptions.symbols.map(s => s.value);
    
    if (timeframe && !validTimeframes.includes(timeframe)) {
      return res.status(400).json({ 
        error: `Invalid timeframe. Valid options: ${validTimeframes.join(', ')}` 
      });
    }
    
    if (symbols) {
      const invalidSymbols = symbols.filter(s => !validSymbols.includes(s));
      if (invalidSymbols.length > 0) {
        return res.status(400).json({ 
          error: `Invalid symbols: ${invalidSymbols.join(', ')}. Valid options: ${validSymbols.join(', ')}` 
        });
      }
    }
    
    // Update runtime config
    if (symbols) runtimeConfig.symbols = symbols;
    if (timeframe) runtimeConfig.timeframe = timeframe;
    if (interval_seconds) runtimeConfig.interval_seconds = interval_seconds;
    if (typeof enabled === 'boolean') runtimeConfig.enabled = enabled;
    
    // Save to file
    saveRuntimeConfig(runtimeConfig);
    
    res.json({ 
      message: 'Configuration updated successfully',
      config: runtimeConfig
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Available Options (timeframes and symbols)
app.get('/api/options', (req, res) => {
  res.json(getAvailableOptions());
});

// Start Initialization
let server;
let analysisInterval = null;

const startAnalysisLoop = () => {
  // Clear existing interval
  if (analysisInterval) {
    clearInterval(analysisInterval);
  }
  
  const intervalMs = runtimeConfig.interval_seconds * 1000;
  
  console.log(`\n🚀 Starting Trading Loop:`);
  console.log(`   Symbols: ${runtimeConfig.symbols.join(', ')}`);
  console.log(`   Timeframe: ${runtimeConfig.timeframe}`);
  console.log(`   Interval: ${runtimeConfig.interval_seconds}s\n`);
  
  // Safe analysis runner
  const safeRunAnalysis = async (sym, tf) => {
    try {
      await runAnalysis(sym, tf);
    } catch (err) {
      console.error(`Analysis error for ${sym}:`, err.message);
    }
  };
  
  // Initial run
  if (runtimeConfig.enabled) {
    runtimeConfig.symbols.forEach(sym => safeRunAnalysis(sym, runtimeConfig.timeframe));
  }
  
  // Scheduled run
  analysisInterval = setInterval(() => {
    if (runtimeConfig.enabled) {
      console.log('\n⏰ Running scheduled analysis...');
      runtimeConfig.symbols.forEach(sym => safeRunAnalysis(sym, runtimeConfig.timeframe));
    } else {
      console.log('\n⏸️  Trading loop paused');
    }
  }, intervalMs);
};

const startServer = async () => {
  console.log('DB_NAME in index.js:', process.env.DB_NAME);
  try {
    console.log('Running Database Sync...');
    // await sequelize.sync({ force: true }); 
    console.log('Database synced successfully (Manual).');

    // Start Server
    server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      startAnalysisLoop();
    });
    
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

startServer();
