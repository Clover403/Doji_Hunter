const axios = require('axios');
require('dotenv').config();

const BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://127.0.0.1:5000';

const getCandles = async (symbol, timeframe, count = 20) => {
  try {
    const response = await axios.get(`${BRIDGE_URL}/candles`, {
      params: { symbol, timeframe, count }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error.message);
    throw error;
  }
};

const placeOrder = async (orderData) => {
  try {
    // orderData: { symbol, type: 'BUY'|'SELL', sl, tp, volume }
    const response = await axios.post(`${BRIDGE_URL}/order`, orderData);
    return response.data;
  } catch (error) {
    console.error(`Error placing order for ${symbol}:`, error.message);
    throw error;
  }
};

module.exports = {
  getCandles,
  placeOrder
};
