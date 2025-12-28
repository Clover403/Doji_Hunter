/**
 * =============================================================================
 * TRADING SERVICE - REAL TRADING EXECUTION
 * =============================================================================
 * 
 * This service handles trading analysis and order execution.
 * 
 * CRITICAL RULES:
 * 1. MT5 is the SINGLE SOURCE OF TRUTH for all positions
 * 2. Orders MUST be verified in MT5 BEFORE saving to database
 * 3. Database stores HISTORY only, NOT live state
 * 4. If MT5 verification fails, order is NOT saved
 * 5. NO mock trading in production (USE_MOCK_MT5=false)
 * 
 * ORDER FLOW:
 * 1. Send order to MT5 Bridge
 * 2. Verify success from MT5 (retcode == 10009)
 * 3. Query MT5 positions_get() to confirm position exists
 * 4. ONLY THEN save order to database as historical record
 * 
 * =============================================================================
 */

// Load env first
require('dotenv').config();

const { AiAnalysis: ai_analysis, AiModelResult: ai_model_results, Order: orders, sequelize } = require('../../models');
console.log('TradingService Models Check:', { 
  ai_analysis: !!ai_analysis, 
  tableName: ai_analysis ? ai_analysis.tableName : 'N/A',
  ai_model_results: !!ai_model_results, 
  orders: !!orders 
});

// =============================================================================
// SERVICE LOADING - STRICT MODE
// =============================================================================
const useMockMT5 = process.env.USE_MOCK_MT5 === 'true';
console.log('🔧 TradingService USE_MOCK_MT5:', process.env.USE_MOCK_MT5, '-> Mock mode:', useMockMT5);

// Load MT5 service based on mode
let mt5Service;
if (useMockMT5) {
  console.log('=' .repeat(60));
  console.log('⚠️  WARNING: MOCK MT5 MODE ENABLED');
  console.log('⚠️  No real trades will execute');
  console.log('⚠️  Set USE_MOCK_MT5=false for real trading');
  console.log('='.repeat(60));
  mt5Service = require('./mt5Service.mock');
} else {
  console.log('✅ REAL MT5 MODE - Orders will execute on MT5');
  mt5Service = require('./mt5Service');
}

// Manual analyzer (always available)
const manualAnalyzer = require('./manualAnalyzer');

// Order Management
const orderManagement = require('./orderManagement');

// AI Service with fallback
let aiService = null;
let aiServiceAvailable = false;
const useMockAI = process.env.USE_MOCK_AI === 'true';

if (useMockAI) {
  console.log('⚠️  Using MOCK AI Service for testing');
  aiService = require('./aiService.mock');
  aiServiceAvailable = true;
} else {
  try {
    aiService = require('./aiService');
    aiServiceAvailable = true;
    console.log('✅ AI Service loaded successfully');
  } catch (error) {
    console.log('⚠️  AI Service failed to load, will fallback to Manual Analysis');
    aiServiceAvailable = false;
  }
}

// Fixed confidence threshold: 75% for both AI and Manual
const MIN_CONFIDENCE = 0.75;
console.log(`📊 Confidence Threshold: ${(MIN_CONFIDENCE * 100).toFixed(0)}% (Required for both AI and Manual)`);
console.log('📋 Trading Strategy: AI + Manual combined (auto-fallback to Manual-only if AI fails)');

/**
 * Check if system is ready for trading
 * @returns {Promise<{ready: boolean, errors: string[]}>}
 */
const checkTradingReadiness = async () => {
  if (useMockMT5) {
    return { ready: true, mock: true, errors: [] };
  }
  
  try {
    const health = await mt5Service.checkTradingHealth();
    return health;
  } catch (error) {
    return { ready: false, errors: [error.message] };
  }
};

/**
 * Run analysis with combined AI + Manual approach
 * 
 * CRITICAL: This function handles REAL trading when USE_MOCK_MT5=false
 * OPTIMIZATION: Skip AI analysis if no order slot available (save API quota)
 */
const runAnalysis = async (symbol, timeframe) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STARTING ANALYSIS: ${symbol} ${timeframe}`);
  console.log(`Mode: ${useMockMT5 ? 'MOCK' : 'REAL TRADING'}`);
  console.log('='.repeat(60));
  
  let transaction;
  
  try {
    // ==========================================================================
    // STEP 0: CHECK IF ORDER SLOT AVAILABLE (Save AI quota if full)
    // ==========================================================================
    const canOpenResult = await orderManagement.canOpenNewOrder();
    if (!canOpenResult.canOpen) {
      console.log(`\n⏭️  SKIPPING ANALYSIS: ${canOpenResult.reason}`);
      console.log(`💡 AI quota saved - will analyze when order slot available`);
      return { success: true, skipped: true, reason: canOpenResult.reason };
    }
    console.log(`✅ Order slot available (${canOpenResult.currentOrders}/${canOpenResult.maxOrders})`);

    // ==========================================================================
    // STEP 1: Check trading readiness (skip for mock mode)
    // ==========================================================================
    if (!useMockMT5) {
      const readiness = await checkTradingReadiness();
      if (!readiness.ready) {
        console.error('❌ TRADING NOT READY:', readiness.errors);
        console.log('⏭️  Skipping trading analysis - MT5 not available');
        return { success: false, error: 'MT5 not ready', details: readiness.errors };
      }
      console.log('✅ MT5 Trading System Ready');
    }
    
    // ==========================================================================
    // STEP 2: Fetch Candle Data
    // ==========================================================================
    const candles = await mt5Service.getCandles(symbol, timeframe, 10);
    if (!candles || candles.length === 0) {
      console.log('❌ No candle data received.');
      return { success: false, error: 'No candle data' };
    }
    console.log(`✅ Received ${candles.length} candles for ${symbol}`);

    // ==========================================================================
    // STEP 3: Run Manual Analysis (always runs)
    // ==========================================================================
    console.log('\n--- Manual Analysis ---');
    const manualResult = await manualAnalyzer.analyze(candles, symbol);
    console.log('Manual Result:', {
      model: manualResult.model_name,
      is_doji: manualResult.is_doji,
      confidence: manualResult.confidence,
      reason: manualResult.reason
    });

    // ==========================================================================
    // STEP 4: Try AI Analysis (with graceful fallback)
    // ==========================================================================
    let aiResult = null;
    let aiError = null;
    
    if (aiServiceAvailable && aiService) {
      console.log('\n--- AI Analysis ---');
      try {
        aiResult = await aiService.analyzeCandles(symbol, timeframe, candles);
        console.log('AI Result:', {
          model: aiResult.model_name,
          is_doji: aiResult.is_doji,
          confidence: aiResult.confidence
        });
      } catch (error) {
        aiError = error;
        console.log(`⚠️  AI Analysis failed: ${error.message}`);
        console.log('✅ Auto-fallback to Manual Analysis only...');
      }
    } else {
      console.log('\n--- AI Analysis ---');
      console.log('⚠️  AI Service not available');
      console.log('✅ Using Manual Analysis only');
    }

    // ==========================================================================
    // STEP 5: Determine Final Result - DUAL ANALYSIS STRATEGY
    // ==========================================================================
    // RULE 1: If AI Available → Both AI and Manual must agree (>= 75% each)
    // RULE 2: If AI Failed/Unavailable → Manual only (>= 75%)
    // ==========================================================================
    let finalIsDoji = false;
    let finalConfidence = 0;
    let finalReason = '';
    let analysisMode = '';
    let suggestedDirection = null;

    if (aiResult && !aiError) {
      // AI Available - Require BOTH to agree with >= 75% confidence
      const aiConf = aiResult.is_doji ? aiResult.confidence : 0;
      const manualConf = manualResult.is_doji ? manualResult.confidence : 0;
      
      if (aiResult.is_doji && manualResult.is_doji) {
        if (aiConf >= MIN_CONFIDENCE && manualConf >= MIN_CONFIDENCE) {
          finalIsDoji = true;
          finalConfidence = (aiConf + manualConf) / 2;
          finalReason = `✅ DUAL CONFIRMATION: AI (${(aiConf * 100).toFixed(0)}%) + Manual (${(manualConf * 100).toFixed(0)}%)`;
          analysisMode = 'dual-confirmed';
          suggestedDirection = manualResult.suggested_direction || null;
        } else {
          finalReason = `❌ Both detected Doji but confidence too low: AI=${(aiConf * 100).toFixed(0)}%, Manual=${(manualConf * 100).toFixed(0)}% (need >= 75%)`;
          analysisMode = 'dual-low-confidence';
        }
      } else if (aiResult.is_doji && !manualResult.is_doji) {
        finalReason = `❌ AI detected Doji (${(aiConf * 100).toFixed(0)}%) but Manual did not. Both must agree.`;
        analysisMode = 'ai-only-rejected';
      } else if (!aiResult.is_doji && manualResult.is_doji) {
        finalReason = `❌ Manual detected Doji (${(manualConf * 100).toFixed(0)}%) but AI did not. Both must agree.`;
        analysisMode = 'manual-only-rejected';
      } else {
        finalReason = `❌ Neither AI nor Manual detected Doji pattern.`;
        analysisMode = 'none';
      }
    } else {
      // AI Failed/Unavailable - Use Manual Only with 75% threshold
      console.log('\n⚠️  AI unavailable - Using Manual Analysis ONLY');
      if (manualResult.is_doji && manualResult.confidence >= MIN_CONFIDENCE) {
        finalIsDoji = true;
        finalConfidence = manualResult.confidence;
        finalReason = `✅ MANUAL ONLY (AI unavailable): ${(manualResult.confidence * 100).toFixed(0)}% confidence`;
        analysisMode = 'manual-fallback';
        suggestedDirection = manualResult.suggested_direction || null;
      } else if (manualResult.is_doji && manualResult.confidence < MIN_CONFIDENCE) {
        finalReason = `❌ Manual detected Doji but confidence too low: ${(manualResult.confidence * 100).toFixed(0)}% (need >= 75%)`;
        analysisMode = 'manual-low-confidence';
      } else {
        finalReason = `❌ Manual analysis: ${manualResult.reason}`;
        analysisMode = 'manual-no-doji';
      }
    }

    console.log(`\n--- Final Decision ---`);
    console.log(`Mode: ${analysisMode}`);
    console.log(`Is Doji: ${finalIsDoji}`);
    console.log(`Confidence: ${(finalConfidence * 100).toFixed(2)}%`);
    console.log(`Reason: ${finalReason}`);

    // ==========================================================================
    // STEP 6: Start Database Transaction
    // ==========================================================================
    transaction = await sequelize.transaction();

    // Save Analysis Record
    const analysisRecord = await ai_analysis.create({
      symbol,
      timeframe,
      is_doji_detected: finalIsDoji,
      status: 'waiting'
    }, { transaction });

    // Save Manual Model Result
    await ai_model_results.create({
      analysis_id: analysisRecord.id,
      model_name: manualResult.model_name,
      confidence: manualResult.confidence
    }, { transaction });

    // Save AI Model Result (if available)
    if (aiResult) {
      await ai_model_results.create({
        analysis_id: analysisRecord.id,
        model_name: aiResult.model_name,
        confidence: aiResult.confidence
      }, { transaction });
    }

    // ==========================================================================
    // STEP 7: Trading Decision
    // ==========================================================================
    if (finalIsDoji && finalConfidence >= MIN_CONFIDENCE) {
      console.log('\n🚀 ENTRY SIGNAL DETECTED!');
      
      // =======================================================================
      // CHECK MAX ORDERS LIMIT FIRST
      // =======================================================================
      const canOpenResult = await orderManagement.canOpenNewOrder();
      if (!canOpenResult.canOpen) {
        console.log(`\n⚠️ CANNOT OPEN NEW ORDER: ${canOpenResult.reason}`);
        await analysisRecord.update({ status: 'max_orders_reached' }, { transaction });
        await transaction.commit();
        console.log('Analysis saved, but order skipped due to limit.');
        return { success: true, analysisId: analysisRecord.id, orderSkipped: true };
      }
      
      const dojiCandle = candles[candles.length - 1];
      let orderType = suggestedDirection || 'BUY';
      
      if (!suggestedDirection && candles.length >= 2) {
        const prevCandle = candles[candles.length - 2];
        orderType = prevCandle.close > prevCandle.open ? 'SELL' : 'BUY';
      }

      // Calculate SL/TP
      const slDistance = (dojiCandle.high - dojiCandle.low) * 1.5;
      const tpDistance = (dojiCandle.high - dojiCandle.low) * 2;
      
      const sl = orderType === 'BUY' 
        ? dojiCandle.low - slDistance 
        : dojiCandle.high + slDistance;
      const tp = orderType === 'BUY' 
        ? dojiCandle.close + tpDistance 
        : dojiCandle.close - tpDistance;

      // =======================================================================
      // CRITICAL: Execute order and verify in MT5
      // =======================================================================
      try {
        console.log('\n' + '='.repeat(60));
        console.log('📤 EXECUTING ORDER ON MT5');
        console.log('='.repeat(60));
        
        // Step A: Send order to MT5
        const orderResult = await mt5Service.placeOrder({
          symbol,
          type: orderType,
          sl,
          tp,
          volume: 0.1
        });

        // Step B: Verify order success
        if (!orderResult.success && !useMockMT5) {
          throw new Error(`MT5 rejected order: ${orderResult.error}`);
        }

        // Step C: Verify position exists in MT5 (real mode only)
        let positionVerified = orderResult.position_verified || false;
        
        if (!useMockMT5 && orderResult.order_ticket) {
          console.log('\n⏳ Verifying position in MT5...');
          
          // Wait a moment for MT5 to register the position
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const verification = await mt5Service.verifyPosition(orderResult.order_ticket);
          positionVerified = verification.exists;
          
          if (!positionVerified) {
            // Try broader position search
            const positions = await mt5Service.getPositions();
            if (positions.success && positions.positions.length > 0) {
              const matchingPos = positions.positions.find(p => 
                p.symbol === symbol && 
                p.magic === 234000 &&
                Math.abs(p.price_open - orderResult.entry_price) < 1
              );
              positionVerified = !!matchingPos;
            }
          }
          
          if (!positionVerified) {
            console.error('❌ CRITICAL: Position NOT found in MT5!');
            console.error('❌ Order may have failed silently.');
            console.error('❌ NOT saving to database.');
            await analysisRecord.update({ status: 'mt5_verification_failed' }, { transaction });
            throw new Error('Position not verified in MT5');
          }
          
          console.log('✅ POSITION VERIFIED IN MT5');
        }

        // =======================================================================
        // Step D: ONLY NOW save order to database (as historical record)
        // =======================================================================
        console.log('\n📝 Saving order to database (historical record)...');
        
        await orders.create({
          analysis_id: analysisRecord.id,
          order_ticket: String(orderResult.order_ticket),
          symbol: symbol,
          type: orderType,
          entry_price: orderResult.entry_price,
          sl: sl,
          tp: tp,
          volume: orderResult.volume || 0.1,
          risk_per_trade: 1.0,
          result: 'OPEN',
          mt5_verified: positionVerified,
          created_at: new Date()
        }, { transaction });

        await analysisRecord.update({ status: 'entry' }, { transaction });

        console.log('\n' + '='.repeat(60));
        console.log('✅ ORDER EXECUTED AND VERIFIED');
        console.log('='.repeat(60));
        console.log(`   Ticket: ${orderResult.order_ticket}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Type: ${orderType}`);
        console.log(`   Entry: ${orderResult.entry_price}`);
        console.log(`   MT5 Verified: ${positionVerified}`);

      } catch (orderError) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ ORDER EXECUTION FAILED');
        console.error('='.repeat(60));
        console.error('   Error:', orderError.message);
        console.error('   Order NOT saved to database');
        
        await analysisRecord.update({ status: 'order_failed' }, { transaction });
      }
    } else {
      console.log(`\nNo entry signal: finalDoji=${finalIsDoji}, confidence=${(finalConfidence * 100).toFixed(0)}%`);
      await analysisRecord.update({ status: 'ignored' }, { transaction });
    }

    await transaction.commit();
    console.log('\n✅ Analysis cycle completed.');
    
    return { success: true, analysisId: analysisRecord.id };

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('\n❌ Analysis failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get active positions from MT5 (SOURCE OF TRUTH)
 * Dashboard should call this for live positions
 */
const getActivePositions = async () => {
  if (useMockMT5) {
    // In mock mode, return database orders marked as OPEN
    const dbOrders = await orders.findAll({
      where: { result: 'OPEN' },
      order: [['created_at', 'DESC']]
    });
    return {
      source: 'database_mock',
      positions: dbOrders.map(o => ({
        ticket: o.order_ticket,
        symbol: o.symbol,
        type: o.type,
        volume: o.volume || 0.1,
        price_open: o.entry_price,
        sl: o.sl,
        tp: o.tp,
        profit: 0
      }))
    };
  }
  
  // REAL MODE: Get positions from MT5
  const mt5Positions = await mt5Service.getPositions();
  
  return {
    source: 'mt5_live',
    success: mt5Positions.success,
    count: mt5Positions.count || 0,
    positions: mt5Positions.positions || []
  };
};

/**
 * Get historical orders from database
 * These are records of past trades, NOT live state
 */
const getHistoricalOrders = async (limit = 50) => {
  const dbOrders = await orders.findAll({
    order: [['created_at', 'DESC']],
    limit
  });
  
  return {
    source: 'database_history',
    count: dbOrders.length,
    orders: dbOrders
  };
};

/**
 * Sync order status with MT5
 * Updates database orders based on MT5 position status
 */
const syncOrdersWithMT5 = async () => {
  if (useMockMT5) {
    console.log('⚠️  Skipping MT5 sync in mock mode');
    return { synced: 0 };
  }
  
  try {
    // Get all OPEN orders from database
    const openOrders = await orders.findAll({
      where: { result: 'OPEN' }
    });
    
    if (openOrders.length === 0) {
      return { synced: 0 };
    }
    
    // Get current positions from MT5
    const mt5Positions = await mt5Service.getPositions();
    
    if (!mt5Positions.success) {
      console.error('❌ Cannot sync - MT5 positions unavailable');
      return { synced: 0, error: mt5Positions.error };
    }
    
    const mt5Tickets = new Set(mt5Positions.positions.map(p => String(p.ticket)));
    let syncedCount = 0;
    
    // Check each open order
    for (const order of openOrders) {
      if (!mt5Tickets.has(order.order_ticket)) {
        // Position no longer exists in MT5 - mark as closed
        console.log(`📝 Position ${order.order_ticket} closed in MT5, updating database`);
        
        // We don't know if it was WON or LOST without more data
        // Mark as CLOSED for now
        await order.update({ result: 'CLOSED' });
        syncedCount++;
      }
    }
    
    console.log(`✅ Synced ${syncedCount} orders with MT5`);
    return { synced: syncedCount };
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
    return { synced: 0, error: error.message };
  }
};

/**
 * Get current configuration
 */
const getConfig = () => {
  return {
    symbols: (process.env.TRADING_SYMBOLS || 'BTCUSD,ETHUSD').split(','),
    timeframe: process.env.TRADING_TIMEFRAME || 'M15',
    interval: parseInt(process.env.TRADING_INTERVAL || '900'),
    minConfidence: MIN_CONFIDENCE,
    useMockAI: useMockAI,
    useMockMT5: useMockMT5,
    aiServiceAvailable: aiServiceAvailable
  };
};

/**
 * Available options
 */
const getAvailableOptions = () => {
  return {
    timeframes: [
      { value: 'M1', label: '1 Minute' },
      { value: 'M5', label: '5 Minutes' },
      { value: 'M15', label: '15 Minutes' },
      { value: 'M30', label: '30 Minutes' },
      { value: 'H1', label: '1 Hour' },
      { value: 'H4', label: '4 Hours' },
      { value: 'D1', label: 'Daily' }
    ],
    symbols: [
      { value: 'BTCUSD', label: 'Bitcoin/USD', category: 'Crypto' },
      { value: 'ETHUSD', label: 'Ethereum/USD', category: 'Crypto' },
      { value: 'XAUUSD.PRO', label: 'Gold/USD', category: 'Commodities' },
      { value: 'EURUSD', label: 'EUR/USD', category: 'Forex' },
      { value: 'GBPUSD', label: 'GBP/USD', category: 'Forex' },
      { value: 'USDJPY', label: 'USD/JPY', category: 'Forex' },
      { value: 'AUDUSD', label: 'AUD/USD', category: 'Forex' }
    ]
  };
};

module.exports = { 
  runAnalysis, 
  getConfig, 
  getAvailableOptions,
  checkTradingReadiness,
  getActivePositions,
  getHistoricalOrders,
  syncOrdersWithMT5,
  MIN_CONFIDENCE,
  // Order Management exports
  closeAllPositions: orderManagement.closeAllPositions,
  monitorPositions: orderManagement.monitorPositions,
  getOpenOrderCount: orderManagement.getOpenOrderCount,
  canOpenNewOrder: orderManagement.canOpenNewOrder
};
