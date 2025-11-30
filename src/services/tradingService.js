const { AiAnalysis: ai_analysis, AiModelResult: ai_model_results, Order: orders, sequelize } = require('../../models');
console.log('TradingService Models Check:', { 
  ai_analysis: !!ai_analysis, 
  tableName: ai_analysis ? ai_analysis.tableName : 'N/A',
  ai_model_results: !!ai_model_results, 
  orders: !!orders 
});
const mt5Service = require('./mt5Service');
const aiService = require('./aiService');

const MIN_CONFIDENCE = 0.75;

const runAnalysis = async (symbol, timeframe) => {
  console.log(`Starting analysis for ${symbol} on ${timeframe}...`);
  
  let transaction;
  try {
    // 1. Fetch Data
    const candles = await mt5Service.getCandles(symbol, timeframe, 10);
    if (!candles || candles.length === 0) {
      console.log('No candle data received.');
      return;
    }

    // 2. AI Analysis
    const aiResult = await aiService.analyzeCandles(symbol, timeframe, candles);
    console.log('AI Result:', aiResult);

    // 3. Save Analysis Record
    // transaction = await sequelize.transaction();
    
    let analysisRecord;
    try {
      analysisRecord = await ai_analysis.create({
        symbol,
        timeframe,
        is_doji_detected: aiResult.is_doji,
        status: 'waiting' // Default status
      });
    } catch (createError) {
        console.error("Model create failed:", createError.message);
        throw createError;
    }

    // Save Model Result
    await ai_model_results.create({
      analysis_id: analysisRecord.id,
      model_name: aiResult.model_name,
      confidence: aiResult.confidence
    });

    // 4. Decision Logic
    if (aiResult.is_doji && aiResult.confidence >= MIN_CONFIDENCE) {
      console.log('Entry Signal Detected!');
      
      // Determine direction (Simplification: usually need context for buy/sell)
      // For Doji, usually reversal. We need to know trend or just guess for this demo.
      // I'll add a logic to check the previous candle color for reversal.
      // Or I can ask AI to determine direction too.
      // For now, I will assume a simple strategy: 
      // If previous candle was GREEN (Close > Open) -> Expect Reversal -> SELL
      // If previous candle was RED (Close < Open) -> Expect Reversal -> BUY
      // Using the candle BEFORE the doji (index -2)
      
      const dojiCandle = candles[candles.length - 1];
      const prevCandle = candles[candles.length - 2];
      
      let orderType = 'BUY';
      if (prevCandle.close > prevCandle.open) {
        orderType = 'SELL';
      }

      // Update Status
      await analysisRecord.update({ status: 'entry' }, { transaction });

      // 5. Place Order
      // Risk management: simplified
      const sl = orderType === 'BUY' ? dojiCandle.low - 0.0005 : dojiCandle.high + 0.0005;
      const tp = orderType === 'BUY' ? dojiCandle.close + 0.0010 : dojiCandle.close - 0.0010;
      
      try {
        const orderResult = await mt5Service.placeOrder({
          symbol,
          type: orderType,
          sl,
          tp,
          volume: 0.1
        });

        // 6. Save Order Record
        await orders.create({
          analysis_id: analysisRecord.id,
          order_ticket: String(orderResult.order_ticket),
          symbol: symbol,
          type: orderType,
          entry_price: orderResult.entry_price,
          sl: sl,
          tp: tp,
          risk_per_trade: 1.0, // 1% fixed for now
          result: 'OPEN',
          created_at: new Date()
        }, { transaction });

        console.log(`Order placed: ${orderResult.order_ticket}`);
      } catch (orderError) {
        console.error("Failed to place order:", orderError.message);
        // Rollback or just log? If analysis is saved, we might want to keep it but mark status ignored?
        // If order fails, we might want to revert 'entry' status.
        await analysisRecord.update({ status: 'ignored' }, { transaction });
      }
    } else {
       await analysisRecord.update({ status: 'ignored' }, { transaction });
    }

    await transaction.commit();
    console.log('Analysis cycle completed.');

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Analysis failed:', error);
  }
};

module.exports = { runAnalysis };
