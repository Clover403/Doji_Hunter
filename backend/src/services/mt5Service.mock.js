// Mock MT5 Service - Generate realistic candle data for testing

const generateRealisticCandles = (symbol, count = 20) => {
  const candles = [];
  const now = Date.now();
  
  // Base price by symbol
  const basePrices = {
    'BTCUSD': 42000,
    'ETHUSD': 2300,
    'XAUUSD': 2050,
    'EURUSD': 1.0850,
    'GBPUSD': 1.2700,
    'USDJPY': 149.50,
    'AUDUSD': 0.6700
  };
  
  const basePrice = basePrices[symbol] || 1000;
  const isForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'].includes(symbol);
  
  let currentPrice = basePrice;
  
  // Decide if we'll inject a 3-candle Doji pattern (25% chance)
  const inject3CandlePattern = Math.random() < 0.25;
  const patternStartIndex = inject3CandlePattern ? Math.floor(Math.random() * (count - 5)) + 2 : -1;
  
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - (i * 15 * 60 * 1000)); // 15 min intervals
    
    // Random movement
    const volatility = isForex ? basePrice * 0.001 : basePrice * 0.002; // 0.1% for forex, 0.2% for others
    const movement = (Math.random() - 0.5) * volatility;
    currentPrice = currentPrice + movement;
    
    const open = currentPrice;
    let high, low, close;
    
    // Check if this candle is part of a 3-candle pattern
    const candlePosition = count - 1 - i;
    
    if (inject3CandlePattern && candlePosition >= patternStartIndex && candlePosition < patternStartIndex + 3) {
      const positionInPattern = candlePosition - patternStartIndex;
      
      if (positionInPattern === 0) {
        // Candle 1: Long BEARISH candle (>60% body ratio)
        close = open - volatility * 0.8;
        high = open + volatility * 0.1;
        low = close - volatility * 0.1;
        console.log(`[Mock MT5] Injecting pattern candle 1 (long bearish)`);
        
      } else if (positionInPattern === 1) {
        // Candle 2: Short body DOJI (<15% body ratio)
        const wickSize = volatility * 0.6;
        high = open + wickSize;
        low = open - wickSize;
        close = open + (Math.random() - 0.5) * volatility * 0.1; // Very small body
        console.log(`[Mock MT5] Injecting pattern candle 2 (doji)`);
        
      } else {
        // Candle 3: Long BULLISH candle (opposite direction)
        close = open + volatility * 0.8;
        low = open - volatility * 0.1;
        high = close + volatility * 0.1;
        console.log(`[Mock MT5] Injecting pattern candle 3 (long bullish reversal)`);
      }
      
    } else {
      // Normal random candle generation
      const candleType = Math.random();
      
      if (candleType < 0.15) {
        // 15% chance: Generate single DOJI (body < 10% of range)
        const wickSize = volatility * 0.8;
        
        // Calculate high/low first
        const upperWick = Math.random() * wickSize;
        const lowerWick = Math.random() * wickSize;
        high = open + upperWick;
        low = open - lowerWick;
        
        // Body is < 10% of total range
        const totalRange = high - low;
        const bodySize = totalRange * 0.08; // 8% of range
        
        close = open + (Math.random() - 0.5) * bodySize;
        
      } else if (candleType < 0.5) {
        // 35% chance: Bullish candle
        close = open + Math.random() * volatility * 0.7;
        high = close + Math.random() * volatility * 0.3;
        low = open - Math.random() * volatility * 0.2;
        
      } else {
        // 50% chance: Bearish candle
        close = open - Math.random() * volatility * 0.7;
        high = open + Math.random() * volatility * 0.3;
        low = close - Math.random() * volatility * 0.2;
      }
    }
    
    // Round based on symbol type
    const decimals = isForex ? 5 : 2;
    
    candles.push({
      time: time.toISOString(),
      open: parseFloat(open.toFixed(decimals)),
      high: parseFloat(high.toFixed(decimals)),
      low: parseFloat(low.toFixed(decimals)),
      close: parseFloat(close.toFixed(decimals)),
      volume: Math.floor(Math.random() * 1000) + 100
    });
    
    currentPrice = close;
  }
  
  if (inject3CandlePattern) {
    console.log(`[Mock MT5] Injected 3-candle Doji pattern at positions ${patternStartIndex}-${patternStartIndex + 2}`);
  }
  
  return candles;
};

const getCandles = async (symbol, timeframe, count = 20) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`[Mock MT5] Generating ${count} candles for ${symbol} ${timeframe}`);
  return generateRealisticCandles(symbol, count);
};

const placeOrder = async (orderData) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const orderTicket = Math.floor(Math.random() * 1000000) + 100000;
  
  console.log(`[Mock MT5] Order placed: ${orderData.type} ${orderData.symbol} @ ${orderData.volume} lot`);
  
  return {
    success: true,
    order_ticket: orderTicket,
    symbol: orderData.symbol,
    type: orderData.type,
    entry_price: orderData.type === 'BUY' ? orderData.tp - 50 : orderData.tp + 50,
    sl: orderData.sl,
    tp: orderData.tp,
    volume: orderData.volume
  };
};

const getAccountInfo = async () => {
  return {
    balance: 10000,
    equity: 10000,
    margin: 0,
    freeMargin: 10000,
    leverage: 100
  };
};

module.exports = {
  getCandles,
  placeOrder,
  getAccountInfo
};
