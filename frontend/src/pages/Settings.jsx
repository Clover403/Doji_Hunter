import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Button, PageHeader, Badge } from '../components/ui';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Info, Save, Play, Pause, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [options, setOptions] = useState({ timeframes: [], symbols: [] });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthCheck, setHealthCheck] = useState({ backend: null, mt5: null });
  
  // Form state
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('M15');
  const [enabled, setEnabled] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, statusRes, optionsRes] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
        apiService.get('/options')
      ]);
      setConfig(configRes.data);
      setStatus(statusRes.data);
      setOptions(optionsRes.data);
      
      // Initialize form state from config
      setSelectedSymbols(configRes.data.symbols || []);
      setSelectedTimeframe(configRes.data.timeframe || 'M15');
      setEnabled(statusRes.data.status === 'running');
      
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

  const handleSymbolToggle = (symbol) => {
    setSelectedSymbols(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleSaveConfig = async () => {
    if (selectedSymbols.length === 0) {
      alert('Please select at least one symbol');
      return;
    }
    
    try {
      setSaving(true);
      await apiService.post('/config', {
        symbols: selectedSymbols,
        timeframe: selectedTimeframe,
        enabled: enabled
      });
      alert('Configuration saved! Changes will take effect on next analysis cycle.');
      fetchData();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBot = async () => {
    try {
      setSaving(true);
      await apiService.post('/config', { enabled: !enabled });
      setEnabled(!enabled);
      fetchData();
    } catch (err) {
      alert('Failed to toggle: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const triggerAnalysis = async () => {
    try {
      setSaving(true);
      await apiService.triggerAnalysis({});
      alert('Analysis triggered for all symbols!');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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
        title="Settings & Configuration" 
        subtitle="Manage trading bot settings, symbols, and timeframes"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={triggerAnalysis} disabled={saving}>
              <Play className="w-4 h-4" />
              Run Analysis Now
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { fetchData(); checkMT5Health(); }}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-doji-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Symbol Selection */}
          <div className="card lg:col-span-2">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Trading Configuration
              </h3>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSaveConfig}
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
            <div className="card-body space-y-6">
              {/* Bot Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-doji-dark rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Trading Bot Status</h4>
                  <p className="text-sm text-doji-text-muted">Enable or disable automatic analysis</p>
                </div>
                <Button 
                  variant={enabled ? 'danger' : 'primary'}
                  size="sm"
                  onClick={handleToggleBot}
                  disabled={saving}
                >
                  {enabled ? <><Pause className="w-4 h-4" /> Pause Bot</> : <><Play className="w-4 h-4" /> Start Bot</>}
                </Button>
              </div>

              {/* Timeframe Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Select Timeframe</label>
                <div className="flex flex-wrap gap-2">
                  {options.timeframes.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setSelectedTimeframe(tf.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTimeframe === tf.value
                          ? 'bg-doji-green text-black'
                          : 'bg-doji-dark text-doji-text-muted hover:bg-doji-border hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Select Trading Symbols <span className="text-doji-text-muted">({selectedSymbols.length} selected)</span>
                </label>
                
                {/* Group by category */}
                {['Crypto', 'Forex', 'Commodities'].map(category => {
                  const categorySymbols = options.symbols.filter(s => s.category === category);
                  if (categorySymbols.length === 0) return null;
                  
                  return (
                    <div key={category} className="mb-4">
                      <h5 className="text-xs text-doji-text-muted uppercase tracking-wider mb-2">{category}</h5>
                      <div className="flex flex-wrap gap-2">
                        {categorySymbols.map((symbol) => (
                          <button
                            key={symbol.value}
                            onClick={() => handleSymbolToggle(symbol.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedSymbols.includes(symbol.value)
                                ? 'bg-doji-green text-black'
                                : 'bg-doji-dark text-doji-text-muted hover:bg-doji-border hover:text-white'
                            }`}
                          >
                            {symbol.value}
                            <span className="ml-1 opacity-60">({symbol.label.split('/')[0]})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

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
                    <p className="font-medium text-white">MT5 Bridge / Mock</p>
                    <p className="text-xs text-doji-text-muted">{config?.useMockMT5 ? 'Mock Data' : 'Python Flask'}</p>
                  </div>
                </div>
                <Badge variant={healthCheck.mt5 ? 'success' : 'danger'}>
                  {healthCheck.mt5 ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-doji-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={config?.aiServiceAvailable} />
                  <div>
                    <p className="font-medium text-white">AI Service</p>
                    <p className="text-xs text-doji-text-muted">{config?.useMockAI ? 'Mock AI' : 'Gemini AI'}</p>
                  </div>
                </div>
                <Badge variant={config?.aiServiceAvailable ? 'success' : 'warning'}>
                  {config?.aiServiceAvailable ? (config?.useMockAI ? 'Mock' : 'Active') : 'Manual Only'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-doji-dark rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={enabled} />
                  <div>
                    <p className="font-medium text-white">Trading Bot</p>
                    <p className="text-xs text-doji-text-muted">Auto analysis loop</p>
                  </div>
                </div>
                <Badge variant={enabled ? 'success' : 'warning'}>
                  {enabled ? 'RUNNING' : 'PAUSED'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Current Configuration */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-medium text-white">Current Configuration</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Active Symbols</span>
                <div className="flex gap-2 flex-wrap justify-end">
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
                <span className="font-mono text-white">{config?.interval_seconds ? Math.round(config.interval_seconds / 60) : 15} minutes</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-doji-border">
                <span className="text-doji-text-muted">Min Confidence</span>
                <span className="font-mono text-doji-green">{((config?.min_confidence || 0.75) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-doji-text-muted">Analysis Mode</span>
                <Badge variant="info">
                  {config?.useMockAI ? 'Mock AI + Manual' : (config?.aiServiceAvailable ? 'AI + Manual' : 'Manual Only')}
                </Badge>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-doji-green/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">1️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">Data Collection</h4>
                  <p className="text-sm text-doji-text-muted">
                    Fetches OHLC candle data at each timeframe
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">2️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">Manual Analysis</h4>
                  <p className="text-sm text-doji-text-muted">
                    3-candle pattern detection (Morning/Evening Star)
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">3️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">AI Analysis</h4>
                  <p className="text-sm text-doji-text-muted">
                    AI confirms pattern (or Manual-only if AI unavailable)
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-doji-green/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">4️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">Trade Execution</h4>
                  <p className="text-sm text-doji-text-muted">
                    If both ≥75% confidence, places order with SL/TP
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Analysis Info */}
          <div className="card lg:col-span-2">
            <div className="card-body flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-white mb-2">Manual 3-Candle Doji Pattern</h4>
                <p className="text-sm text-doji-text-muted mb-3">
                  The manual analyzer looks for a specific 3-candle reversal pattern:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-doji-dark p-3 rounded-lg">
                    <span className="text-doji-green font-bold">Candle 1:</span>
                    <p className="text-doji-text-muted">Long body (&gt;50% of range) - Strong momentum</p>
                  </div>
                  <div className="bg-doji-dark p-3 rounded-lg">
                    <span className="text-yellow-400 font-bold">Candle 2:</span>
                    <p className="text-doji-text-muted">Short body (&lt;25% of range) - Indecision/Doji</p>
                  </div>
                  <div className="bg-doji-dark p-3 rounded-lg">
                    <span className="text-doji-red font-bold">Candle 3:</span>
                    <p className="text-doji-text-muted">Long body, OPPOSITE direction - Reversal confirmation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
