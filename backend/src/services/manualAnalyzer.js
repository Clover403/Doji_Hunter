/**
 * Manual Doji Analyzer Service
 * 
 * Analyzes 3-candle Doji pattern:
 * - Candle 1: Long body (strong momentum)
 * - Candle 2: Very short body (indecision/Doji)
 * - Candle 3: Long body with OPPOSITE direction (reversal confirmation)
 * 
 * This creates a "Morning Star" or "Evening Star" pattern which is a strong reversal signal
 */

const analyzeDojiPattern = (candles) => {
  if (!candles || candles.length < 3) {
    return {
      is_doji: false,
      confidence: 0,
      reason: 'Insufficient candles for 3-candle pattern analysis'
    };
  }

  // Get last 3 candles (most recent first, so reverse order)
  const [candle3, candle2, candle1] = candles.slice(-3).reverse();
  
  // Calculate body sizes and directions
  const body1 = Math.abs(candle1.close - candle1.open);
  const body2 = Math.abs(candle2.close - candle2.open);
  const body3 = Math.abs(candle3.close - candle3.open);
  
  const range1 = candle1.high - candle1.low;
  const range2 = candle2.high - candle2.low;
  const range3 = candle3.high - candle3.low;
  
  // Avoid division by zero
  if (range1 === 0 || range2 === 0 || range3 === 0) {
    return {
      is_doji: false,
      confidence: 0,
      reason: 'Invalid candle data (zero range)'
    };
  }
  
  // Calculate body ratios
  const ratio1 = body1 / range1;
  const ratio2 = body2 / range2;
  const ratio3 = body3 / range3;
  
  // Determine directions (bullish = close > open)
  const direction1 = candle1.close > candle1.open ? 'bullish' : 'bearish';
  const direction3 = candle3.close > candle3.open ? 'bullish' : 'bearish';
  
  // Pattern criteria:
  // 1. Candle 1: Body ratio > 50% (long candle)
  // 2. Candle 2: Body ratio < 25% (short body / Doji)
  // 3. Candle 3: Body ratio > 50% AND opposite direction to candle 1
  
  const isCandle1Long = ratio1 > 0.50;
  const isCandle2Short = ratio2 < 0.25;
  const isCandle3Long = ratio3 > 0.50;
  const isDirectionReversed = direction1 !== direction3;
  
  console.log(`[Manual Analyzer] Candle 1: ratio=${(ratio1 * 100).toFixed(2)}%, direction=${direction1}, isLong=${isCandle1Long}`);
  console.log(`[Manual Analyzer] Candle 2: ratio=${(ratio2 * 100).toFixed(2)}%, isShort=${isCandle2Short}`);
  console.log(`[Manual Analyzer] Candle 3: ratio=${(ratio3 * 100).toFixed(2)}%, direction=${direction3}, isLong=${isCandle3Long}`);
  console.log(`[Manual Analyzer] Direction reversed: ${isDirectionReversed}`);
  
  // Check if all criteria match
  const isValidDojiPattern = isCandle1Long && isCandle2Short && isCandle3Long && isDirectionReversed;
  
  if (isValidDojiPattern) {
    // Calculate confidence based on how well the pattern matches
    let confidence = 0.75; // Base confidence for valid pattern
    
    // Bonus for very clear candle 1 (stronger initial move)
    if (ratio1 > 0.65) confidence += 0.05;
    if (ratio1 > 0.75) confidence += 0.05;
    
    // Bonus for very short candle 2 (clearer indecision)
    if (ratio2 < 0.15) confidence += 0.05;
    if (ratio2 < 0.10) confidence += 0.05;
    
    // Bonus for very clear candle 3 (stronger reversal)
    if (ratio3 > 0.65) confidence += 0.05;
    if (ratio3 > 0.75) confidence += 0.05;
    
    confidence = Math.min(0.98, confidence); // Cap at 98%
    
    const patternType = direction3 === 'bullish' ? 'Morning Star (Bullish Reversal)' : 'Evening Star (Bearish Reversal)';
    const tradeDirection = direction3 === 'bullish' ? 'BUY' : 'SELL';
    
    return {
      is_doji: true,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `Valid 3-candle Doji pattern detected: ${patternType}. Candle1 body: ${(ratio1 * 100).toFixed(1)}%, Candle2 body: ${(ratio2 * 100).toFixed(1)}%, Candle3 body: ${(ratio3 * 100).toFixed(1)}%.`,
      pattern_type: patternType,
      suggested_direction: tradeDirection,
      candle_analysis: {
        candle1: { ratio: ratio1, direction: direction1, body: body1 },
        candle2: { ratio: ratio2, body: body2 },
        candle3: { ratio: ratio3, direction: direction3, body: body3 }
      }
    };
  }
  
  // Not a valid pattern - explain why
  let failReasons = [];
  if (!isCandle1Long) failReasons.push(`Candle1 not long (${(ratio1 * 100).toFixed(1)}% < 50%)`);
  if (!isCandle2Short) failReasons.push(`Candle2 not short (${(ratio2 * 100).toFixed(1)}% > 25%)`);
  if (!isCandle3Long) failReasons.push(`Candle3 not long (${(ratio3 * 100).toFixed(1)}% < 50%)`);
  if (!isDirectionReversed) failReasons.push(`No direction reversal (both ${direction1})`);
  
  return {
    is_doji: false,
    confidence: 0,
    reason: `Not a valid 3-candle Doji pattern. ${failReasons.join('. ')}.`
  };
};

/**
 * Simple single-candle Doji detection (backup)
 */
const analyzeSingleCandleDoji = (candle) => {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  
  if (range === 0) {
    return { is_doji: false, confidence: 0, reason: 'Invalid candle (zero range)' };
  }
  
  const ratio = body / range;
  const isDoji = ratio < 0.15; // Very strict: body < 15% of range
  
  if (isDoji) {
    const confidence = Math.max(0.75, Math.min(0.90, 1 - (ratio * 4)));
    return {
      is_doji: true,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `Single Doji candle detected. Body ratio: ${(ratio * 100).toFixed(2)}%.`
    };
  }
  
  return {
    is_doji: false,
    confidence: 0,
    reason: `Not a Doji. Body ratio: ${(ratio * 100).toFixed(2)}% exceeds 15% threshold.`
  };
};

/**
 * Main analysis function - tries 3-candle pattern first, falls back to single candle
 */
const analyze = async (candles, symbol) => {
  console.log(`\n[Manual Analyzer] Starting analysis for ${symbol} with ${candles.length} candles`);
  
  // Try 3-candle pattern first (more reliable)
  const patternResult = analyzeDojiPattern(candles);
  
  if (patternResult.is_doji) {
    console.log(`[Manual Analyzer] ✅ 3-candle Doji pattern found for ${symbol}!`);
    return {
      model_name: 'manual-3candle-v1',
      ...patternResult
    };
  }
  
  // Fall back to single candle Doji detection
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const singleResult = analyzeSingleCandleDoji(lastCandle);
    
    if (singleResult.is_doji) {
      console.log(`[Manual Analyzer] ✅ Single Doji candle found for ${symbol}!`);
      return {
        model_name: 'manual-single-v1',
        ...singleResult
      };
    }
  }
  
  console.log(`[Manual Analyzer] ❌ No Doji pattern found for ${symbol}`);
  return {
    model_name: 'manual-3candle-v1',
    ...patternResult
  };
};

module.exports = {
  analyze,
  analyzeDojiPattern,
  analyzeSingleCandleDoji
};
