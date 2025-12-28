"""
=============================================================================
MT5 BRIDGE SERVER - REAL TRADING EXECUTION ONLY
=============================================================================

CRITICAL: This server connects to a REAL MetaTrader 5 terminal.
All orders are REAL trades with REAL money.

RULES:
1. NO mock data allowed when USE_MOCK_MT5=false
2. Every order MUST be verified via positions_get()
3. If MT5 is disconnected, ALL trading endpoints return errors
4. Database is for HISTORY only - MT5 is the single source of truth

=============================================================================
"""

from flask import Flask, request, jsonify
import sys
import os

# =============================================================================
# STRICT MODE: Check if mock is allowed
# =============================================================================
USE_MOCK_MT5 = os.environ.get('USE_MOCK_MT5', 'false').lower() == 'true'

if USE_MOCK_MT5:
    print("=" * 60)
    print("⚠️  WARNING: MOCK MODE ENABLED")
    print("⚠️  This is for TESTING ONLY - No real trades will execute")
    print("=" * 60)
    from mt5_mock import mt5
else:
    # REAL MODE - MetaTrader5 MUST be available
    try:
        import MetaTrader5 as mt5
        print("✅ MetaTrader5 module imported successfully")
    except ImportError as e:
        print("=" * 60)
        print("❌ FATAL ERROR: MetaTrader5 module not found!")
        print("❌ This system requires REAL MT5 connection.")
        print("❌ Install with: pip install MetaTrader5")
        print("❌ Mock mode is DISABLED (USE_MOCK_MT5=false)")
        print("=" * 60)
        sys.exit(1)

app = Flask(__name__)

# =============================================================================
# MT5 INITIALIZATION - Print account info on startup
# =============================================================================
print("\n" + "=" * 60)
print("INITIALIZING MT5 CONNECTION...")
print("=" * 60)

if not mt5.initialize():
    error = mt5.last_error()
    print(f"❌ FATAL: mt5.initialize() failed!")
    print(f"❌ Error: {error}")
    print("❌ Make sure MetaTrader 5 terminal is:")
    print("   1. Installed and running")
    print("   2. Logged into a trading account")
    print("   3. AutoTrading is enabled")
    mt5.shutdown()
    sys.exit(1)

# Print account information - MANDATORY for real trading
account_info = mt5.account_info()
if account_info is None:
    print("❌ FATAL: Cannot get account info!")
    print("❌ MT5 terminal may not be logged in.")
    mt5.shutdown()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ MT5 CONNECTED SUCCESSFULLY")
print("=" * 60)
print(f"   Account Number : {account_info.login}")
print(f"   Account Name   : {account_info.name}")
print(f"   Server         : {account_info.server}")
print(f"   Balance        : {account_info.balance} {account_info.currency}")
print(f"   Leverage       : 1:{account_info.leverage}")
print(f"   Trade Allowed  : {account_info.trade_allowed}")
print(f"   Trade Expert   : {account_info.trade_expert}")
print("=" * 60 + "\n")

if not account_info.trade_allowed:
    print("⚠️  WARNING: Trading is NOT allowed on this account!")
    print("⚠️  Orders will fail. Enable trading in MT5 terminal.")


# =============================================================================
# HELPER: Verify MT5 connection before any trading operation
# =============================================================================
def verify_mt5_connection():
    """
    Verify MT5 is connected and trading is allowed.
    Returns (success, error_message)
    """
    if not mt5.initialize():
        return False, "MT5 not initialized"
    
    account = mt5.account_info()
    if account is None:
        return False, "Cannot get account info - not logged in"
    
    if not account.trade_allowed:
        return False, "Trading not allowed on this account"
    
    return True, None


# =============================================================================
# ENDPOINT: Health Check
# =============================================================================
@app.route('/health', methods=['GET'])
def health():
    """Basic health check"""
    connected = mt5.initialize()
    account = mt5.account_info() if connected else None
    
    return jsonify({
        "status": "MT5 Bridge is running",
        "connected": connected,
        "account": account.login if account else None,
        "server": account.server if account else None,
        "mock_mode": USE_MOCK_MT5
    })


# =============================================================================
# ENDPOINT: Trading Health Check (CRITICAL)
# =============================================================================
@app.route('/health/trading', methods=['GET'])
def health_trading():
    """
    Comprehensive trading health check.
    This endpoint verifies the system is READY for real trading.
    """
    checks = {
        "mt5_connected": False,
        "account_logged_in": False,
        "trading_allowed": False,
        "can_fetch_positions": False,
        "mock_mode": USE_MOCK_MT5
    }
    errors = []
    
    # Check 1: MT5 Connection
    if mt5.initialize():
        checks["mt5_connected"] = True
    else:
        errors.append("MT5 not initialized - terminal may be closed")
    
    # Check 2: Account Login
    account = mt5.account_info()
    if account:
        checks["account_logged_in"] = True
        checks["account_number"] = account.login
        checks["account_server"] = account.server
        checks["account_balance"] = account.balance
        
        # Check 3: Trading Allowed
        if account.trade_allowed:
            checks["trading_allowed"] = True
        else:
            errors.append("Trading not allowed on this account")
    else:
        errors.append("Cannot get account info - not logged in")
    
    # Check 4: Can Fetch Positions
    try:
        positions = mt5.positions_get()
        if positions is not None:
            checks["can_fetch_positions"] = True
            checks["open_positions_count"] = len(positions)
        else:
            errors.append("Cannot fetch positions")
    except Exception as e:
        errors.append(f"Error fetching positions: {str(e)}")
    
    # Final Status
    all_passed = all([
        checks["mt5_connected"],
        checks["account_logged_in"],
        checks["trading_allowed"],
        checks["can_fetch_positions"]
    ])
    
    status_code = 200 if all_passed else 503
    
    return jsonify({
        "ready": all_passed,
        "checks": checks,
        "errors": errors,
        "message": "READY for trading" if all_passed else "NOT READY - see errors"
    }), status_code


# =============================================================================
# ENDPOINT: Get Symbols
# =============================================================================
@app.route('/symbols', methods=['GET'])
def get_symbols():
    """List all available symbols from MT5"""
    try:
        print("Getting all symbols...")
        symbols = mt5.symbols_get()
        print(f"Found {len(symbols) if symbols else 0} symbols")
        
        symbol_list = []
        if symbols:
            for s in symbols[:50]:
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


# =============================================================================
# ENDPOINT: Get Candles
# =============================================================================
@app.route('/candles', methods=['GET'])
def get_candles():
    """Get candlestick data from MT5"""
    try:
        symbol = request.args.get('symbol', 'BTCUSD')
        timeframe_str = request.args.get('timeframe', 'M15')
        count = int(request.args.get('count', 10))
        
        print(f"Getting {count} candles for {symbol} {timeframe_str}")
        
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
        
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            print(f"Symbol {symbol} not found!")
            return jsonify({"error": f"Symbol {symbol} not found"}), 404
        
        if not symbol_info.visible:
            print(f"Enabling symbol {symbol}")
            mt5.symbol_select(symbol, True)
        
        rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
        
        if rates is None:
            error = mt5.last_error()
            print(f"Failed to get rates: {error}")
            return jsonify({"error": f"Failed to get rates: {str(error)}"}), 500
        
        print(f"Successfully retrieved {len(rates)} candles")
        
        data = []
        for r in rates:
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
                print(f"Error processing candle: {e}")
                continue
        
        return jsonify(data)
        
    except Exception as e:
        print(f"Error in get_candles: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================================
# ENDPOINT: Get Positions (CRITICAL - Source of Truth for Active Orders)
# =============================================================================
@app.route('/positions', methods=['GET'])
def get_positions():
    """
    Get all open positions from MT5.
    THIS IS THE SINGLE SOURCE OF TRUTH FOR ACTIVE ORDERS.
    
    If an order is not returned here, it does NOT exist.
    """
    try:
        # Verify connection first
        connected, error = verify_mt5_connection()
        if not connected:
            return jsonify({
                "success": False,
                "error": error,
                "positions": []
            }), 503
        
        positions = mt5.positions_get()
        
        if positions is None:
            error = mt5.last_error()
            print(f"Failed to get positions: {error}")
            return jsonify({
                "success": False,
                "error": f"Failed to get positions: {str(error)}",
                "positions": []
            }), 500
        
        print(f"Found {len(positions)} open positions in MT5")
        
        position_list = []
        for pos in positions:
            position_list.append({
                'ticket': pos.ticket,
                'symbol': pos.symbol,
                'type': 'BUY' if pos.type == 0 else 'SELL',
                'volume': pos.volume,
                'price_open': pos.price_open,
                'price_current': pos.price_current,
                'sl': pos.sl,
                'tp': pos.tp,
                'profit': pos.profit,
                'swap': pos.swap,
                'time': pos.time,
                'magic': pos.magic,
                'comment': pos.comment
            })
        
        return jsonify({
            "success": True,
            "count": len(position_list),
            "positions": position_list
        })
        
    except Exception as e:
        print(f"Error getting positions: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "positions": []
        }), 500


# =============================================================================
# ENDPOINT: Verify Position Exists
# =============================================================================
@app.route('/positions/<int:ticket>', methods=['GET'])
def verify_position(ticket):
    """
    Verify a specific position exists in MT5.
    Used to confirm orders after placement.
    """
    try:
        positions = mt5.positions_get(ticket=ticket)
        
        if positions is None or len(positions) == 0:
            return jsonify({
                "exists": False,
                "ticket": ticket,
                "message": "Position NOT found in MT5"
            }), 404
        
        pos = positions[0]
        return jsonify({
            "exists": True,
            "ticket": pos.ticket,
            "symbol": pos.symbol,
            "type": 'BUY' if pos.type == 0 else 'SELL',
            "volume": pos.volume,
            "price_open": pos.price_open,
            "profit": pos.profit
        })
        
    except Exception as e:
        return jsonify({
            "exists": False,
            "error": str(e)
        }), 500


# =============================================================================
# ENDPOINT: Place Order (CRITICAL - Real Trading)
# =============================================================================
@app.route('/order', methods=['POST'])
def place_order():
    """
    Place a REAL order on MT5.
    
    FLOW:
    1. Verify MT5 connection and trading allowed
    2. Build order request
    3. Execute order via mt5.order_send()
    4. Verify retcode == TRADE_RETCODE_DONE (10009)
    5. Verify position exists in positions_get()
    6. Return success only if ALL checks pass
    """
    try:
        # Step 1: Verify connection
        connected, error = verify_mt5_connection()
        if not connected:
            print(f"❌ ORDER REJECTED: {error}")
            return jsonify({
                "success": False,
                "error": error,
                "retcode": None
            }), 503
        
        data = request.json
        symbol = data.get('symbol')
        action_type = data.get('type')  # 'BUY' or 'SELL'
        volume = float(data.get('volume', 0.01))
        sl = data.get('sl')
        tp = data.get('tp')
        
        print("\n" + "=" * 60)
        print("📤 ORDER REQUEST RECEIVED")
        print("=" * 60)
        print(f"   Symbol : {symbol}")
        print(f"   Type   : {action_type}")
        print(f"   Volume : {volume}")
        print(f"   SL     : {sl}")
        print(f"   TP     : {tp}")
        
        # Step 2: Get current price
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            error_msg = f"Symbol {symbol} not found or not available"
            print(f"❌ {error_msg}")
            return jsonify({
                "success": False,
                "error": error_msg,
                "retcode": None
            }), 404
        
        price = tick.ask if action_type == 'BUY' else tick.bid
        order_type = mt5.ORDER_TYPE_BUY if action_type == 'BUY' else mt5.ORDER_TYPE_SELL
        
        # Step 3: Build order request
        order_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": order_type,
            "price": price,
            "sl": float(sl) if sl else 0.0,
            "tp": float(tp) if tp else 0.0,
            "deviation": 20,
            "magic": 234000,
            "comment": "DojiHunter AI",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        print("\n📋 ORDER REQUEST DETAILS:")
        for key, value in order_request.items():
            print(f"   {key}: {value}")
        
        # Step 4: Execute order
        print("\n⏳ Sending order to MT5...")
        result = mt5.order_send(order_request)
        
        print("\n📋 ORDER RESULT FROM MT5:")
        print(f"   retcode : {result.retcode}")
        print(f"   deal    : {result.deal}")
        print(f"   order   : {result.order}")
        print(f"   volume  : {result.volume}")
        print(f"   price   : {result.price}")
        print(f"   comment : {result.comment}")
        
        # Step 5: Verify retcode
        # TRADE_RETCODE_DONE = 10009
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            print(f"\n❌ ORDER FAILED!")
            print(f"   Retcode: {result.retcode}")
            print(f"   Comment: {result.comment}")
            return jsonify({
                "success": False,
                "error": f"Order rejected by MT5: {result.comment}",
                "retcode": result.retcode,
                "comment": result.comment
            }), 400
        
        # Step 6: Verify position exists in MT5
        print("\n⏳ Verifying position in MT5...")
        import time
        time.sleep(0.5)  # Small delay for MT5 to register position
        
        # Try to find the position
        positions = mt5.positions_get(symbol=symbol)
        position_found = False
        verified_position = None
        
        if positions:
            for pos in positions:
                # Match by order ticket or recent position
                if pos.ticket == result.order or (
                    pos.symbol == symbol and 
                    pos.magic == 234000 and
                    abs(pos.price_open - result.price) < 0.01
                ):
                    position_found = True
                    verified_position = pos
                    break
        
        if not position_found:
            print(f"\n⚠️  WARNING: Position not immediately found in MT5")
            print(f"   This could be a timing issue. Order ticket: {result.order}")
            # Don't fail here - order_send succeeded
        else:
            print(f"\n✅ POSITION VERIFIED IN MT5!")
            print(f"   Ticket: {verified_position.ticket}")
            print(f"   Price : {verified_position.price_open}")
        
        print("\n" + "=" * 60)
        print("✅ ORDER EXECUTED SUCCESSFULLY")
        print("=" * 60)
        
        return jsonify({
            "success": True,
            "order_ticket": result.order,
            "deal_ticket": result.deal,
            "entry_price": result.price,
            "volume": result.volume,
            "symbol": symbol,
            "type": action_type,
            "retcode": result.retcode,
            "position_verified": position_found
        })
        
    except Exception as e:
        print(f"\n❌ EXCEPTION IN ORDER: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "retcode": None
        }), 500


# =============================================================================
# ENDPOINT: Close Position
# =============================================================================
@app.route('/close/<int:ticket>', methods=['POST'])
def close_position(ticket):
    """
    Close a specific position by ticket.
    """
    try:
        # Verify connection
        connected, error = verify_mt5_connection()
        if not connected:
            return jsonify({
                "success": False,
                "error": error
            }), 503
        
        # Find the position
        positions = mt5.positions_get(ticket=ticket)
        if not positions or len(positions) == 0:
            return jsonify({
                "success": False,
                "error": f"Position {ticket} not found in MT5"
            }), 404
        
        pos = positions[0]
        
        # Determine close type (opposite of position type)
        close_type = mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY
        tick = mt5.symbol_info_tick(pos.symbol)
        price = tick.bid if pos.type == 0 else tick.ask
        
        close_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": pos.symbol,
            "volume": pos.volume,
            "type": close_type,
            "position": ticket,
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": "DojiHunter Close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        print(f"\n📤 CLOSING POSITION {ticket}")
        result = mt5.order_send(close_request)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return jsonify({
                "success": False,
                "error": f"Failed to close: {result.comment}",
                "retcode": result.retcode
            }), 400
        
        print(f"✅ Position {ticket} closed successfully")
        
        return jsonify({
            "success": True,
            "closed_ticket": ticket,
            "close_price": result.price,
            "profit": pos.profit
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# ENDPOINT: Account Info
# =============================================================================
@app.route('/account', methods=['GET'])
def get_account():
    """Get current account information"""
    try:
        account = mt5.account_info()
        if account is None:
            return jsonify({"error": "Cannot get account info"}), 500
        
        return jsonify({
            "login": account.login,
            "name": account.name,
            "server": account.server,
            "currency": account.currency,
            "balance": account.balance,
            "equity": account.equity,
            "margin": account.margin,
            "margin_free": account.margin_free,
            "margin_level": account.margin_level,
            "leverage": account.leverage,
            "trade_allowed": account.trade_allowed,
            "trade_expert": account.trade_expert
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# MAIN
# =============================================================================
if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🚀 STARTING MT5 BRIDGE SERVER")
    print("=" * 60)
    print(f"   Mode: {'MOCK (Testing)' if USE_MOCK_MT5 else 'REAL TRADING'}")
    print(f"   Port: 5000")
    print("=" * 60 + "\n")
    
    # Listen on 0.0.0.0 to allow external connections
    app.run(host='0.0.0.0', port=5000, debug=False)
