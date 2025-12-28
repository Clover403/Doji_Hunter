/**
 * =============================================================================
 * ORDER MANAGEMENT SERVICE
 * =============================================================================
 * 
 * Handles:
 * 1. Order closing logic (AI + Manual algorithm)
 * 2. Maximum order limit enforcement
 * 3. Stop loss / Take profit monitoring
 * 4. Position verification with MT5
 * 
 * RULES:
 * - Maximum 2 open orders at any time
 * - Close if price reverses and exceeds doji candle range
 * - AI analysis for optimal exit points
 * - MT5 is the SINGLE SOURCE OF TRUTH
 * 
 * =============================================================================
 */

// Load env first
require('dotenv').config();

const mt5Service = require('./mt5Service');

// Configuration
const MAX_OPEN_ORDERS = parseInt(process.env.MAX_OPEN_ORDERS || '2');
const MAGIC_NUMBER = 234000; // DojiHunter magic number

console.log('🔧 OrderManagement: MAX_OPEN_ORDERS =', MAX_OPEN_ORDERS);

/**
 * Check how many DojiHunter orders are currently open in MT5
 * @returns {Promise<{count: number, positions: Array}>}
 */
const getOpenOrderCount = async () => {
  try {
    const result = await mt5Service.getPositions();
    
    if (!result.success) {
      console.error('❌ Cannot get positions from MT5:', result.error);
      return { count: 0, positions: [], error: result.error };
    }
    
    // Filter only DojiHunter orders (magic number 234000)
    const dojiHunterOrders = result.positions.filter(pos => pos.magic === MAGIC_NUMBER);
    
    console.log(`📊 Open DojiHunter orders: ${dojiHunterOrders.length}/${MAX_OPEN_ORDERS}`);
    
    return {
      count: dojiHunterOrders.length,
      positions: dojiHunterOrders,
      totalPositions: result.positions.length
    };
  } catch (error) {
    console.error('❌ Error checking open orders:', error.message);
    return { count: 0, positions: [], error: error.message };
  }
};

/**
 * Check if we can open a new order
 * @returns {Promise<{canOpen: boolean, reason: string}>}
 */
const canOpenNewOrder = async () => {
  const { count, error } = await getOpenOrderCount();
  
  if (error) {
    return { 
      canOpen: false, 
      reason: `Cannot verify MT5 positions: ${error}` 
    };
  }
  
  if (count >= MAX_OPEN_ORDERS) {
    return { 
      canOpen: false, 
      reason: `Maximum orders reached (${count}/${MAX_OPEN_ORDERS})` 
    };
  }
  
  return { 
    canOpen: true, 
    reason: `Can open ${MAX_OPEN_ORDERS - count} more orders` 
  };
};

/**
 * Manual closing algorithm:
 * Close if price moves against entry and current candle exceeds doji range
 * 
 * @param {object} position - Position from MT5
 * @param {Array} candles - Recent candles
 * @param {object} dojiCandle - The doji candle that triggered entry
 * @returns {{shouldClose: boolean, reason: string}}
 */
const manualClosingAnalysis = (position, candles, dojiCandle = null) => {
  if (!candles || candles.length < 2) {
    return { shouldClose: false, reason: 'Not enough candle data' };
  }
  
  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  
  // If we don't have doji candle data, use a default range
  const dojiRange = dojiCandle 
    ? (dojiCandle.high - dojiCandle.low)
    : (prevCandle.high - prevCandle.low);
  
  const currentRange = currentCandle.high - currentCandle.low;
  const entryPrice = position.price_open;
  const currentPrice = position.price_current || currentCandle.close;
  
  // Determine if price moved against us
  let priceMovedAgainst = false;
  let priceDifference = 0;
  
  if (position.type === 'BUY') {
    // For BUY, bad if price went down
    priceMovedAgainst = currentPrice < entryPrice;
    priceDifference = entryPrice - currentPrice;
  } else {
    // For SELL, bad if price went up
    priceMovedAgainst = currentPrice > entryPrice;
    priceDifference = currentPrice - entryPrice;
  }
  
  // Check if current candle exceeds doji range (strong reversal signal)
  const candleExceedsDoji = currentRange > dojiRange * 1.5;
  
  // Determine candle direction
  const currentCandleBearish = currentCandle.close < currentCandle.open;
  const currentCandleBullish = currentCandle.close > currentCandle.open;
  
  // Close conditions:
  // 1. Price moved against us significantly (more than doji range)
  // 2. Current candle is strong reversal (exceeds doji range)
  // 3. Current candle direction is against our position
  
  if (priceMovedAgainst && priceDifference > dojiRange) {
    if (candleExceedsDoji) {
      const direction = position.type === 'BUY' ? 'bearish' : 'bullish';
      if ((position.type === 'BUY' && currentCandleBearish) || 
          (position.type === 'SELL' && currentCandleBullish)) {
        return {
          shouldClose: true,
          reason: `Strong ${direction} reversal: price moved ${priceDifference.toFixed(2)} against entry, candle range ${currentRange.toFixed(2)} exceeds doji ${dojiRange.toFixed(2)}`,
          analysis: {
            priceMovedAgainst,
            priceDifference,
            dojiRange,
            currentRange,
            candleExceedsDoji
          }
        };
      }
    }
  }
  
  // Check for stop loss hit
  if (position.sl && position.sl > 0) {
    if ((position.type === 'BUY' && currentPrice <= position.sl) ||
        (position.type === 'SELL' && currentPrice >= position.sl)) {
      return {
        shouldClose: true,
        reason: `Stop loss triggered at ${position.sl}`,
        analysis: { stopLossHit: true }
      };
    }
  }
  
  // Check for take profit hit
  if (position.tp && position.tp > 0) {
    if ((position.type === 'BUY' && currentPrice >= position.tp) ||
        (position.type === 'SELL' && currentPrice <= position.tp)) {
      return {
        shouldClose: true,
        reason: `Take profit triggered at ${position.tp}`,
        analysis: { takeProfitHit: true }
      };
    }
  }
  
  return { 
    shouldClose: false, 
    reason: 'No close signal',
    analysis: {
      priceMovedAgainst,
      priceDifference,
      dojiRange,
      currentRange,
      profit: position.profit
    }
  };
};

/**
 * AI-based closing analysis using Gemini
 * @param {object} position - Position from MT5
 * @param {Array} candles - Recent candles
 * @returns {Promise<{shouldClose: boolean, reason: string, confidence: number}>}
 */
const aiClosingAnalysis = async (position, candles) => {
  try {
    // Try to use AI service
    let aiService;
    try {
      aiService = require('./aiService');
    } catch (e) {
      console.log('⚠️ AI Service not available for closing analysis');
      return { shouldClose: false, reason: 'AI not available', confidence: 0 };
    }
    
    const prompt = `
Analyze this trading position and determine if it should be closed:

Position:
- Symbol: ${position.symbol}
- Type: ${position.type}
- Entry Price: ${position.price_open}
- Current Price: ${position.price_current}
- Stop Loss: ${position.sl || 'None'}
- Take Profit: ${position.tp || 'None'}
- Current Profit: ${position.profit}

Recent 5 candles (newest last):
${candles.slice(-5).map((c, i) => `
Candle ${i+1}: Open=${c.open}, High=${c.high}, Low=${c.low}, Close=${c.close}
`).join('')}

Based on technical analysis:
1. Is there a reversal pattern forming?
2. Is the trend continuing in favor of the position?
3. Are there signs of momentum exhaustion?

Respond in JSON format:
{
  "shouldClose": true/false,
  "confidence": 0.0-1.0,
  "reason": "explanation",
  "suggestedAction": "HOLD" or "CLOSE" or "MOVE_SL"
}
`;
    
    const response = await aiService.analyzeWithPrompt(prompt);
    
    // Parse AI response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          shouldClose: analysis.shouldClose || false,
          reason: analysis.reason || 'AI analysis complete',
          confidence: analysis.confidence || 0.5,
          suggestedAction: analysis.suggestedAction || 'HOLD'
        };
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse AI response');
    }
    
    return { shouldClose: false, reason: 'AI analysis inconclusive', confidence: 0.3 };
    
  } catch (error) {
    console.error('❌ AI closing analysis error:', error.message);
    return { shouldClose: false, reason: `AI error: ${error.message}`, confidence: 0 };
  }
};

/**
 * Combined closing analysis (AI + Manual)
 * @param {object} position - Position from MT5  
 * @param {Array} candles - Recent candles
 * @returns {Promise<{shouldClose: boolean, reason: string}>}
 */
const analyzeForClosing = async (position, candles) => {
  console.log(`\n📊 Analyzing position ${position.ticket} for closing...`);
  
  // Manual analysis (always runs)
  const manualResult = manualClosingAnalysis(position, candles);
  console.log(`   Manual Analysis: ${manualResult.shouldClose ? '🔴 CLOSE' : '🟢 HOLD'} - ${manualResult.reason}`);
  
  // If manual says close with strong signal, close immediately
  if (manualResult.shouldClose && manualResult.analysis?.stopLossHit) {
    return { shouldClose: true, reason: manualResult.reason, source: 'manual-sl' };
  }
  
  if (manualResult.shouldClose && manualResult.analysis?.takeProfitHit) {
    return { shouldClose: true, reason: manualResult.reason, source: 'manual-tp' };
  }
  
  // AI analysis (optional enhancement)
  const aiResult = await aiClosingAnalysis(position, candles);
  console.log(`   AI Analysis: ${aiResult.shouldClose ? '🔴 CLOSE' : '🟢 HOLD'} (${(aiResult.confidence * 100).toFixed(0)}%) - ${aiResult.reason}`);
  
  // Decision logic:
  // - If both agree to close -> close
  // - If manual says close with reversal -> close
  // - If AI says close with high confidence (>80%) -> close
  
  if (manualResult.shouldClose && aiResult.shouldClose) {
    return { 
      shouldClose: true, 
      reason: `Both analyses agree: ${manualResult.reason}`,
      source: 'combined'
    };
  }
  
  if (manualResult.shouldClose && manualResult.analysis?.candleExceedsDoji) {
    return { 
      shouldClose: true, 
      reason: manualResult.reason,
      source: 'manual-reversal'
    };
  }
  
  if (aiResult.shouldClose && aiResult.confidence >= 0.8) {
    return { 
      shouldClose: true, 
      reason: `AI high confidence (${(aiResult.confidence * 100).toFixed(0)}%): ${aiResult.reason}`,
      source: 'ai-high-confidence'
    };
  }
  
  return { 
    shouldClose: false, 
    reason: 'No strong close signal',
    manualAnalysis: manualResult,
    aiAnalysis: aiResult
  };
};

/**
 * Close a position in MT5
 * @param {number} ticket - Position ticket
 * @param {string} reason - Reason for closing
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
const closePosition = async (ticket, reason) => {
  console.log(`\n🔴 CLOSING POSITION ${ticket}`);
  console.log(`   Reason: ${reason}`);
  
  try {
    const result = await mt5Service.closePosition(ticket);
    
    if (result.success) {
      console.log(`✅ Position ${ticket} closed successfully`);
      console.log(`   Close Price: ${result.close_price}`);
      console.log(`   Profit: ${result.profit}`);
      return { success: true, result };
    } else {
      console.error(`❌ Failed to close position: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`❌ Error closing position: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Close all DojiHunter positions
 * @param {string} reason - Reason for closing all
 * @returns {Promise<{closed: number, failed: number, results: Array}>}
 */
const closeAllPositions = async (reason = 'Manual close all') => {
  console.log('\n' + '='.repeat(60));
  console.log('🔴 CLOSING ALL DOJIHUNTER POSITIONS');
  console.log('='.repeat(60));
  
  const { positions, error } = await getOpenOrderCount();
  
  if (error) {
    return { closed: 0, failed: 0, error };
  }
  
  if (positions.length === 0) {
    console.log('✅ No DojiHunter positions to close');
    return { closed: 0, failed: 0, results: [] };
  }
  
  console.log(`Found ${positions.length} positions to close`);
  
  const results = [];
  let closed = 0;
  let failed = 0;
  
  for (const pos of positions) {
    const closeResult = await closePosition(pos.ticket, reason);
    results.push({
      ticket: pos.ticket,
      symbol: pos.symbol,
      ...closeResult
    });
    
    if (closeResult.success) {
      closed++;
    } else {
      failed++;
    }
    
    // Small delay between closes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`CLOSE ALL COMPLETE: ${closed} closed, ${failed} failed`);
  console.log('='.repeat(60));
  
  return { closed, failed, results };
};

/**
 * Monitor and manage all open positions
 * @param {object} candlesBySymbol - Map of symbol to candles
 * @returns {Promise<{checked: number, closed: number}>}
 */
const monitorPositions = async (candlesBySymbol) => {
  const { positions, error } = await getOpenOrderCount();
  
  if (error || positions.length === 0) {
    return { checked: 0, closed: 0 };
  }
  
  console.log(`\n📊 Monitoring ${positions.length} open positions...`);
  
  let closed = 0;
  
  for (const position of positions) {
    const candles = candlesBySymbol[position.symbol];
    
    if (!candles || candles.length < 3) {
      console.log(`   ⚠️ No candle data for ${position.symbol}, skipping`);
      continue;
    }
    
    const analysis = await analyzeForClosing(position, candles);
    
    if (analysis.shouldClose) {
      const closeResult = await closePosition(position.ticket, analysis.reason);
      if (closeResult.success) {
        closed++;
      }
    }
  }
  
  return { checked: positions.length, closed };
};

module.exports = {
  MAX_OPEN_ORDERS,
  MAGIC_NUMBER,
  getOpenOrderCount,
  canOpenNewOrder,
  manualClosingAnalysis,
  aiClosingAnalysis,
  analyzeForClosing,
  closePosition,
  closeAllPositions,
  monitorPositions
};
