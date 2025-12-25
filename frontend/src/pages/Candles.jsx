import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Button, PageHeader, Badge } from '../components/ui';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export default function Candles() {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [count, setCount] = useState(20);
  const [error, setError] = useState(null);

  const fetchCandles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCandles({ symbol, timeframe, count });
      setCandles(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching candles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles();
  }, [symbol, timeframe, count]);

  // Detect if a candle is a Doji
  const isDoji = (candle) => {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;
    if (totalSize === 0) return false;
    return (bodySize / totalSize) < 0.1; // Body is less than 10% of total range
  };

  return (
    <div>
      <PageHeader 
        title="Candle Data" 
        subtitle="Live OHLC data from MT5 Bridge"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
            </select>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="M1">M1</option>
              <option value="M5">M5</option>
              <option value="M15">M15</option>
              <option value="M30">M30</option>
              <option value="H1">H1</option>
              <option value="H4">H4</option>
              <option value="D1">D1</option>
            </select>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value={10}>10 candles</option>
              <option value={20}>20 candles</option>
              <option value={50}>50 candles</option>
              <option value={100}>100 candles</option>
            </select>
            <Button variant="secondary" size="sm" onClick={fetchCandles}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-doji-red">Error: {error}</p>
            <p className="text-doji-text-muted text-sm mt-2">Make sure MT5 Bridge server is running</p>
          </div>
        </div>
      )}

      {/* Candle Chart Visualization */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="text-sm font-medium text-white">
            {symbol} - {timeframe} ({candles.length} candles)
          </h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-doji-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
              {candles.map((candle, idx) => {
                const isBullish = candle.close >= candle.open;
                const isDojiCandle = isDoji(candle);
                const maxPrice = Math.max(...candles.map(c => c.high));
                const minPrice = Math.min(...candles.map(c => c.low));
                const range = maxPrice - minPrice || 1;
                
                const bodyTop = Math.max(candle.open, candle.close);
                const bodyBottom = Math.min(candle.open, candle.close);
                const bodyHeight = ((bodyTop - bodyBottom) / range) * 100;
                const bodyBottom_pos = ((bodyBottom - minPrice) / range) * 100;
                const wickTop = ((candle.high - bodyTop) / range) * 100;
                const wickBottom = ((bodyBottom - candle.low) / range) * 100;
                
                return (
                  <div 
                    key={idx}
                    className="flex-shrink-0 w-4 relative group"
                    title={`O: ${candle.open.toFixed(5)} H: ${candle.high.toFixed(5)} L: ${candle.low.toFixed(5)} C: ${candle.close.toFixed(5)}`}
                  >
                    {/* Upper wick */}
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${isDojiCandle ? 'bg-yellow-400' : isBullish ? 'bg-doji-green' : 'bg-doji-red'}`}
                      style={{
                        bottom: `${bodyBottom_pos + bodyHeight}%`,
                        height: `${wickTop}%`
                      }}
                    />
                    {/* Body */}
                    <div 
                      className={`absolute left-0 right-0 rounded-sm ${isDojiCandle ? 'bg-yellow-400' : isBullish ? 'bg-doji-green' : 'bg-doji-red'}`}
                      style={{
                        bottom: `${bodyBottom_pos}%`,
                        height: `${Math.max(bodyHeight, 1)}%`,
                        minHeight: '2px'
                      }}
                    />
                    {/* Lower wick */}
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${isDojiCandle ? 'bg-yellow-400' : isBullish ? 'bg-doji-green' : 'bg-doji-red'}`}
                      style={{
                        bottom: `${bodyBottom_pos - wickBottom}%`,
                        height: `${wickBottom}%`
                      }}
                    />
                    {/* Doji indicator */}
                    {isDojiCandle && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-doji-green rounded"></div>
              <span className="text-doji-text-muted">Bullish</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-doji-red rounded"></div>
              <span className="text-doji-text-muted">Bearish</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span className="text-doji-text-muted">Doji Pattern</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candle Data Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-medium text-white">Raw Candle Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volume</th>
                <th>Direction</th>
                <th>Doji</th>
              </tr>
            </thead>
            <tbody>
              {candles.map((candle, idx) => {
                const isBullish = candle.close >= candle.open;
                const isDojiCandle = isDoji(candle);
                return (
                  <tr key={idx} className={isDojiCandle ? 'bg-yellow-400/5' : ''}>
                    <td>{idx + 1}</td>
                    <td className="text-doji-text-muted text-xs">
                      {new Date(candle.time * 1000).toLocaleString()}
                    </td>
                    <td className="font-mono">{candle.open.toFixed(5)}</td>
                    <td className="font-mono text-doji-green">{candle.high.toFixed(5)}</td>
                    <td className="font-mono text-doji-red">{candle.low.toFixed(5)}</td>
                    <td className="font-mono">{candle.close.toFixed(5)}</td>
                    <td className="text-doji-text-muted">{candle.volume}</td>
                    <td>
                      {isBullish ? (
                        <TrendingUp className="w-4 h-4 text-doji-green" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-doji-red" />
                      )}
                    </td>
                    <td>
                      {isDojiCandle && (
                        <Badge variant="warning">DOJI</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
