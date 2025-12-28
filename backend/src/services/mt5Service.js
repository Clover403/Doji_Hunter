/**
 * =============================================================================
 * MT5 SERVICE - REAL TRADING CLIENT
 * =============================================================================
 * 
 * This service communicates with the Python MT5 Bridge.
 * ALL data comes from the REAL MetaTrader 5 terminal.
 * 
 * RULES:
 * 1. MT5 is the SINGLE SOURCE OF TRUTH for positions
 * 2. Orders MUST be verified in MT5 before considered successful
 * 3. NO fallback to mock data in production
 * 4. ALL failures are reported, never silently ignored
 * 
 * =============================================================================
 */

const axios = require('axios');
require('dotenv').config();

const BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://127.0.0.1:5000';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Create axios instance with timeout
const mt5Client = axios.create({
  baseURL: BRIDGE_URL,
  timeout: REQUEST_TIMEOUT
});

/**
 * Check if MT5 Bridge is healthy and ready for trading
 * @returns {Promise<{ready: boolean, checks: object, errors: string[]}>}
 */
const checkTradingHealth = async () => {
  try {
    const response = await mt5Client.get('/health/trading');
    return response.data;
  } catch (error) {
    console.error('❌ MT5 Trading Health Check Failed:', error.message);
    return {
      ready: false,
      checks: {},
      errors: [error.message],
      message: 'Cannot connect to MT5 Bridge'
    };
  }
};

/**
 * Get candlestick data from MT5
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSD')
 * @param {string} timeframe - Timeframe (e.g., 'M15')
 * @param {number} count - Number of candles to fetch
 * @returns {Promise<Array>} Array of candle objects
 */
const getCandles = async (symbol, timeframe, count = 20) => {
  try {
    const response = await mt5Client.get('/candles', {
      params: { symbol, timeframe, count }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching candles for ${symbol}:`, error.message);
    throw new Error(`Failed to get candles: ${error.message}`);
  }
};

/**
 * Get all open positions from MT5
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR ACTIVE ORDERS
 * 
 * @returns {Promise<{success: boolean, count: number, positions: Array}>}
 */
const getPositions = async () => {
  try {
    const response = await mt5Client.get('/positions');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching positions from MT5:', error.message);
    return {
      success: false,
      count: 0,
      positions: [],
      error: error.message
    };
  }
};

/**
 * Verify a specific position exists in MT5
 * @param {number} ticket - Position ticket number
 * @returns {Promise<{exists: boolean, position?: object}>}
 */
const verifyPosition = async (ticket) => {
  try {
    const response = await mt5Client.get(`/positions/${ticket}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { exists: false, ticket };
    }
    console.error(`❌ Error verifying position ${ticket}:`, error.message);
    return { exists: false, error: error.message };
  }
};

/**
 * Place a REAL order on MT5
 * 
 * CRITICAL: This executes a REAL trade with REAL money.
 * The order is verified in MT5 before returning success.
 * 
 * @param {object} orderData - Order parameters
 * @param {string} orderData.symbol - Trading symbol
 * @param {string} orderData.type - 'BUY' or 'SELL'
 * @param {number} orderData.volume - Lot size
 * @param {number} orderData.sl - Stop loss price
 * @param {number} orderData.tp - Take profit price
 * @returns {Promise<object>} Order result from MT5
 */
const placeOrder = async (orderData) => {
  console.log('\n' + '='.repeat(60));
  console.log('📤 SENDING ORDER TO MT5 BRIDGE');
  console.log('='.repeat(60));
  console.log('   Symbol:', orderData.symbol);
  console.log('   Type:', orderData.type);
  console.log('   Volume:', orderData.volume);
  console.log('   SL:', orderData.sl);
  console.log('   TP:', orderData.tp);
  
  try {
    const response = await mt5Client.post('/order', orderData);
    const result = response.data;
    
    // Check if MT5 bridge reported success
    if (!result.success) {
      console.error('❌ MT5 Bridge rejected order:', result.error);
      throw new Error(`Order rejected: ${result.error} (retcode: ${result.retcode})`);
    }
    
    console.log('\n✅ ORDER CONFIRMED BY MT5 BRIDGE');
    console.log('   Order Ticket:', result.order_ticket);
    console.log('   Entry Price:', result.entry_price);
    console.log('   Position Verified:', result.position_verified);
    
    return result;
    
  } catch (error) {
    // Handle axios errors
    if (error.response) {
      const data = error.response.data;
      console.error('❌ MT5 Order Error:', data.error || error.message);
      throw new Error(`Order failed: ${data.error || error.message}`);
    }
    console.error('❌ Network error placing order:', error.message);
    throw new Error(`Cannot connect to MT5: ${error.message}`);
  }
};

/**
 * Close a position in MT5
 * @param {number} ticket - Position ticket to close
 * @returns {Promise<object>} Close result
 */
const closePosition = async (ticket) => {
  console.log(`\n📤 CLOSING POSITION ${ticket} IN MT5...`);
  
  try {
    const response = await mt5Client.post(`/close/${ticket}`);
    const result = response.data;
    
    if (!result.success) {
      console.error('❌ Failed to close position:', result.error);
      throw new Error(`Close failed: ${result.error}`);
    }
    
    console.log(`✅ Position ${ticket} closed at ${result.close_price}`);
    return result;
    
  } catch (error) {
    if (error.response) {
      const data = error.response.data;
      throw new Error(`Close failed: ${data.error || error.message}`);
    }
    throw new Error(`Cannot connect to MT5: ${error.message}`);
  }
};

/**
 * Get account information from MT5
 * @returns {Promise<object>} Account details
 */
const getAccountInfo = async () => {
  try {
    const response = await mt5Client.get('/account');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting account info:', error.message);
    throw new Error(`Failed to get account: ${error.message}`);
  }
};

/**
 * Get available symbols from MT5
 * @returns {Promise<Array>} List of symbols
 */
const getSymbols = async () => {
  try {
    const response = await mt5Client.get('/symbols');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching symbols:', error.message);
    throw new Error(`Failed to get symbols: ${error.message}`);
  }
};

module.exports = {
  // Health checks
  checkTradingHealth,
  
  // Market data
  getCandles,
  getSymbols,
  
  // Positions (SOURCE OF TRUTH)
  getPositions,
  verifyPosition,
  
  // Trading
  placeOrder,
  closePosition,
  
  // Account
  getAccountInfo,
  
  // Constants
  BRIDGE_URL
};
