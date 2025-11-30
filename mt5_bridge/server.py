from flask import Flask, request, jsonify
import sys
import os

# Try to import MetaTrader5, otherwise use mock
try:
    import MetaTrader5 as mt5
except ImportError:
    print("MetaTrader5 module not found. Using Mock.")
    from mt5_mock import mt5

app = Flask(__name__)

# Initialize MT5 on startup
if not mt5.initialize():
    print("initialize() failed")
    mt5.shutdown()

@app.route('/candles', methods=['GET'])
def get_candles():
    symbol = request.args.get('symbol', 'EURUSD')
    timeframe_str = request.args.get('timeframe', 'M15')
    count = int(request.args.get('count', 20))
    
    # Map timeframe string to MT5 constant (simplified)
    # In real app, this needs robust mapping
    tf_map = {
        'M1': 1,
        'M5': 5,
        'M15': 15,
        'M30': 30,
        'H1': 16385
    }
    tf = tf_map.get(timeframe_str, 15)
    
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    
    if rates is None:
        return jsonify({"error": "Failed to get rates"}), 500
        
    # Convert to list of dicts for JSON
    # rate structure: (time, open, high, low, close, tick_volume, spread, real_volume)
    # Depending on if it's numpy record array (real MT5) or list of tuples (Mock)
    
    data = []
    for r in rates:
        # Check if it's a numpy record or tuple/object
        # Real MT5 returns numpy record array which acts like tuple/object
        # Mock returns tuple
        
        # Normalize access
        try:
            # Try attribute access (if named tuple or similar)
            t = r[0]
            o = r[1]
            h = r[2]
            l = r[3]
            c = r[4]
        except:
            # Fallback
            t = r['time']
            o = r['open']
            h = r['high']
            l = r['low']
            c = r['close']
            
        data.append({
            'time': t,
            'open': o,
            'high': h,
            'low': l,
            'close': c
        })
        
    return jsonify(data)

@app.route('/order', methods=['POST'])
def place_order():
    data = request.json
    symbol = data.get('symbol')
    action_type = data.get('type') # 'BUY' or 'SELL'
    volume = data.get('volume', 0.1)
    sl = data.get('sl')
    tp = data.get('tp')
    
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
        return jsonify({"error": "Order failed", "retcode": result.retcode}), 400
        
    return jsonify({
        "order_ticket": result.order,
        "entry_price": result.price,
        "symbol": symbol,
        "result": "OPEN"
    })

if __name__ == '__main__':
    # Listen on 0.0.0.0 to allow connections from external Node.js app
    app.run(host='0.0.0.0', port=5000)
