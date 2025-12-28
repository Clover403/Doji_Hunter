/**
 * Mock AI Service - Simulates AI analysis for testing
 * Uses mathematical analysis to detect Doji patterns
 */

const analyzeCandles = async (symbol, timeframe, candles) => {
  console.log(`[Mock AI] Analyzing ${candles.length} candles for ${symbol}`);
  
  if (!candles || candles.length === 0) {
    return {
      model_name: 'mock-ai-v1',
      is_doji: false,
      confidence: 0,
      reason: 'No candle data provided'
    };
  }
  
  // Analyze the most recent candle
  const lastCandle = candles[candles.length - 1];
  const body = Math.abs(lastCandle.close - lastCandle.open);
  const range = lastCandle.high - lastCandle.low;
  
  if (range === 0) {
    return {
      model_name: 'mock-ai-v1',
      is_doji: false,
      confidence: 0,
      reason: 'Invalid candle (zero range)'
    };
  }
  
  const bodyRatio = body / range;
  
  // Doji detection: body < 30% of total range
  const isDoji = bodyRatio < 0.30;
  
  console.log(`[Mock AI] ${symbol} - Body: ${body.toFixed(5)}, Range: ${range.toFixed(5)}, Ratio: ${(bodyRatio * 100).toFixed(2)}% | isDoji: ${isDoji}`);
  
  if (isDoji) {
    // Calculate confidence based on how small the body is
    // Smaller body = higher confidence
    const confidence = Math.max(0.75, Math.min(0.95, 1 - (bodyRatio * 3)));
    
    return {
      model_name: 'mock-ai-v1',
      is_doji: true,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `Doji detected with body ratio ${(bodyRatio * 100).toFixed(2)}%. Body: ${body.toFixed(5)}, Range: ${range.toFixed(5)}. Strong indecision signal at ${lastCandle.close}.`
    };
  }
  
  return {
    model_name: 'mock-ai-v1',
    is_doji: false,
    confidence: 0,
    reason: `Not a Doji. Body ratio ${(bodyRatio * 100).toFixed(2)}% exceeds threshold. Clear directional movement ${lastCandle.close > lastCandle.open ? 'upward' : 'downward'}.`
  };
};

module.exports = {
  analyzeCandles
};