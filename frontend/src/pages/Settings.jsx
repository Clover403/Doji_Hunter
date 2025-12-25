import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Button, PageHeader, Badge } from '../components/ui';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthCheck, setHealthCheck] = useState({ backend: null, mt5: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, statusRes] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus()
      ]);
      setConfig(configRes.data);
      setStatus(statusRes.data);
      setHealthCheck(prev => ({ ...prev, backend: true }));
    } catch (err) {
      console.error('Error fetching config:', err);
      setHealthCheck(prev => ({ ...prev, backend: false }));
    } finally {
      setLoading(false);
    }
  };

  const checkMT5Health = async () => {
    try {
      const response = await apiService.getCandles({ symbol: 'BTCUSD', count: 1 });
      setHealthCheck(prev => ({ ...prev, mt5: Array.isArray(response.data) && response.data.length > 0 }));
    } catch (err) {
      setHealthCheck(prev => ({ ...prev, mt5: false }));
    }
  };

  useEffect(() => {
    fetchData();
    checkMT5Health();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === null) return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return status ? (
      <CheckCircle className="w-5 h-5 text-doji-green" />
    ) : (
      <XCircle className="w-5 h-5 text-doji-red" />
    );
  };

  return (
    <div>
      <PageHeader 
        title="Settings & Status" 
        subtitle="System configuration and health check"
        actions={
          <Button variant="secondary" size="sm" onClick={() => { fetchData(); checkMT5Health(); }}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-doji-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Check */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-medium text-white">System Health</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between p-3 bg-doji-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={healthCheck.backend} />
                  <div>
                    <p className="font-medium text-white">Backend Server</p>
                    <p className="text-xs text-doji-text-muted">Node.js API @ port 3000</p>
                  </div>
                </div>
                <Badge variant={healthCheck.backend ? 'success' : 'danger'}>
                  {healthCheck.backend ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-doji-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={healthCheck.mt5} />
                  <div>
                    <p className="font-medium text-white">MT5 Bridge</p>
                    <p className="text-xs text-doji-text-muted">Python Flask @ port 5000</p>
                  </div>
                </div>
                <Badge variant={healthCheck.mt5 ? 'success' : 'danger'}>
                  {healthCheck.mt5 ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-doji-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={status?.status === 'running'} />
                  <div>
                    <p className="font-medium text-white">Trading Bot</p>
                    <p className="text-xs text-doji-text-muted">Auto analysis loop</p>
                  </div>
                </div>
                <Badge variant={status?.status === 'running' ? 'success' : 'warning'}>
                  {status?.status?.toUpperCase() || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-medium text-white">Bot Configuration</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Trading Symbols</span>
                <div className="flex gap-2">
                  {config?.symbols?.map((s, i) => (
                    <Badge key={i} variant="info">{s}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Timeframe</span>
                <span className="font-mono text-white">{config?.timeframe}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Analysis Interval</span>
                <span className="font-mono text-white">{(config?.interval_ms / 1000 / 60).toFixed(0)} minutes</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Min Confidence</span>
                <span className="font-mono text-doji-green">{(config?.min_confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Info className="w-4 h-4" />
                How DojiHunter Works
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-doji-green/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">1️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">Data Collection</h4>
                  <p className="text-sm text-doji-text-muted">
                    Fetches OHLC candle data from MT5 via Python bridge at each timeframe close
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-doji-green/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">2️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">AI Analysis</h4>
                  <p className="text-sm text-doji-text-muted">
                    Google Gemini AI analyzes candles to detect Doji patterns with confidence score
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-doji-green/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">3️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">Trade Execution</h4>
                  <p className="text-sm text-doji-text-muted">
                    If Doji detected with high confidence, automatically places order with SL/TP
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Notice */}
          <div className="card lg:col-span-2">
            <div className="card-body flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-white mb-2">Google AI API Key Required</h4>
                <p className="text-sm text-doji-text-muted mb-3">
                  To enable AI analysis, you need a valid Google Generative AI API key.
                </p>
                <ol className="text-sm text-doji-text-muted space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-doji-green hover:underline">Google AI Studio</a></li>
                  <li>Create a new API key</li>
                  <li>Update <code className="bg-doji-dark px-2 py-0.5 rounded">GOOGLE_AI_API_KEY</code> in your <code className="bg-doji-dark px-2 py-0.5 rounded">.env</code> file</li>
                  <li>Restart the backend server</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
