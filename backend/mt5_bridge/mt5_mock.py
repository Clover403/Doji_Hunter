import random
import time
from datetime import datetime, timedelta

# Mock constants
TIMEFRAME_M1 = 1
TIMEFRAME_M5 = 5
TIMEFRAME_M15 = 15
TIMEFRAME_H1 = 16385  # MT5 constant for H1
ORDER_TYPE_BUY = 0
ORDER_TYPE_SELL = 1
TRADE_ACTION_DEAL = 1
TRADE_RETCODE_DONE = 10009

class MT5Mock:
    def initialize(self):
        print("MT5 Mock initialized")
        return True

    def shutdown(self):
        print("MT5 Mock shutdown")

    def copy_rates_from_pos(self, symbol, timeframe, start_pos, count):
        # Generate dummy candle data
        rates = []
        current_time = datetime.now()
        # Approximate timeframe in minutes
        tf_minutes = 15
        if timeframe == TIMEFRAME_M1: tf_minutes = 1
        elif timeframe == TIMEFRAME_M5: tf_minutes = 5
        
        base_price = 1.1000 if "EUR" in symbol else 2000.0
        
        for i in range(count):
            t = current_time - timedelta(minutes=tf_minutes * (count - i))
            open_price = base_price + random.uniform(-0.0005, 0.0005)
            close_price = base_price + random.uniform(-0.0005, 0.0005)
            high = max(open_price, close_price) + random.uniform(0, 0.0002)
            low = min(open_price, close_price) - random.uniform(0, 0.0002)
            
            # Simulate a doji occasionally (very small body)
            if random.random() < 0.1:
                close_price = open_price + random.uniform(-0.00001, 0.00001)
            
            rate = (t.timestamp(), open_price, high, low, close_price, 100, 0, 0)
            # MT5 returns numpy array usually, but list of tuples/structs is fine for JSON serialization
            rates.append(rate)
            base_price = close_price
            
        return rates

    def symbol_info_tick(self, symbol):
        class Tick:
            def __init__(self):
                self.ask = 1.1005
                self.bid = 1.1000
        return Tick()

    def order_send(self, request):
        print(f"Order send request: {request}")
        class Result:
            def __init__(self):
                self.retcode = 10009
                self.order = random.randint(100000, 999999)
                self.price = request.get('price', 0.0)
                self.comment = "Request executed"
        return Result()

mt5 = MT5Mock()
