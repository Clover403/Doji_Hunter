from flask import Flask, request, jsonify
import sys
import os

# Try to import MetaTrader5, otherwise use mock
try:
    import MetaTrader5 as mt5
    print("MetaTrader5 module imported successfully")
except ImportError:
    print("MetaTrader5 module not found. Using Mock.")
    from mt5_mock import mt5

app = Flask(__name__)

# Initialize MT5 on startup
print("Initializing MT5...")
if not mt5.initialize():
    print("initialize() failed")
    mt5.shutdown()
    sys.exit(1)
else:
    print("MT5 initialized successfully!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "MT5 Bridge is running", "connected": mt5.initialize()})

@app.route('/symbols', methods=['GET'])
def get_symbols():
    """List all available symbols from MT5"""
    try:
        print("Getting all symbols...")
        symbols = mt5.symbols_get()
        print(f"Found {len(symbols) if symbols else 0} symbols")
        
        symbol_list = []
        if symbols:
            for s in symbols[:50]:  # Limit to first 50 to avoid timeout
                symbol_list.append({
                    'name': s.name,
                    'description': s.description,
                    'trade_contract_size': s.trade_contract_size,
                    'volume_min': s.volume_min,
                    'volume_max': s.volume_max
                })
        return jsonify(symbol_list)
    except Exception as e:
        print(f"Error getting symbols: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/candles', methods=['GET'])
def get_candles():
    try:
        symbol = request.args.get('symbol', 'BTCUSD')
        timeframe_str = request.args.get('timeframe', 'M15')
        count = int(request.args.get('count', 10))
        
        print(f"Getting {count} candles for {symbol} {timeframe_str}")
        
        # Map timeframe string to MT5 constant
        tf_map = {
            'M1': mt5.TIMEFRAME_M1,
            'M5': mt5.TIMEFRAME_M5,
            'M15': mt5.TIMEFRAME_M15,
            'M30': mt5.TIMEFRAME_M30,
            'H1': mt5.TIMEFRAME_H1,
            'H4': mt5.TIMEFRAME_H4,
            'D1': mt5.TIMEFRAME_D1,
        }
        tf = tf_map.get(timeframe_str, mt5.TIMEFRAME_M15)
        
        # Check if symbol is available
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            print(f"Symbol {symbol} not found!")
            return jsonify({"error": f"Symbol {symbol} not found"}), 404
        
        print(f"Symbol found: {symbol_info.name}")
        
        # Enable symbol for trading if needed
        if not symbol_info.visible:
            print(f"Enabling symbol {symbol}")
            if not mt5.symbol_select(symbol, True):
                print(f"Failed to enable symbol {symbol}")
        
        # Get rates
        rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
        
        if rates is None:
            error = mt5.last_error()
            print(f"Failed to get rates: {error}")
            return jsonify({"error": f"Failed to get rates: {str(error)}"}), 500
        
        print(f"Successfully retrieved {len(rates)} candles")
        
        # Convert to list of dicts
        data = []
        for r in rates:
            # Handle both numpy arrays and tuples
            try:
                data.append({
                    'time': int(r[0]),
                    'open': float(r[1]),
                    'high': float(r[2]), 
                    'low': float(r[3]),
                    'close': float(r[4]),
                    'volume': int(r[5]) if len(r) > 5 else 0
                })
            except Exception as e:
                print(f"Error processing candle data: {e}")
                continue
        
        return jsonify(data)
        
    except Exception as e:
        print(f"Error in get_candles: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/order', methods=['POST'])
def place_order():
    try:
        data = request.json
        symbol = data.get('symbol')
        action_type = data.get('type') # 'BUY' or 'SELL'
        volume = data.get('volume', 0.01)
        sl = data.get('sl')
        tp = data.get('tp')
        
        print(f"Placing {action_type} order for {symbol}")
        
        # Check if symbol exists
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return jsonify({"error": "Symbol not found"}), 404
        
        price = tick.ask if action_type == 'BUY' else tick.bid
        order_type = 0 if action_type == 'BUY' else 1 # 0=Buy, 1=Sell
        
        request_order = {
            "action": 1, # TRADE_ACTION_DEAL
            "symbol": symbol,
            "volume": float(volume),
            "type": order_type,
            "price": price,
            "sl": float(sl) if sl else 0.0,
            "tp": float(tp) if tp else 0.0,
            "deviation": 20,
            "magic": 234000,
            "comment": "DojiHunter AI",
            "type_time": 0, # ORDER_TIME_GTC
            "type_filling": 1, # ORDER_FILLING_IOC
        }
        
        result = mt5.order_send(request_order)
        
        if result.retcode != 10009: # TRADE_RETCODE_DONE
            print(f"Order failed: {result.comment}")
            return jsonify({"error": "Order failed", "retcode": result.retcode, "comment": result.comment}), 400
        
        print(f"Order placed successfully: {result.order}")
        return jsonify({
            "order_ticket": result.order,
            "entry_price": result.price,
            "symbol": symbol,
            "result": "OPEN"
        })
        
    except Exception as e:
        print(f"Error in place_order: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting MT5 Bridge Server...")
    # Listen on 0.0.0.0 to allow connections from external Node.js app
    app.run(host='0.0.0.0', port=5000, debug=True)
