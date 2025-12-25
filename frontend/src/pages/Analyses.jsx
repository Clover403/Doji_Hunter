import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { DataTable, Badge, Button, PageHeader } from '../components/ui';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Analyses() {
  const [analyses, setAnalyses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [symbol, setSymbol] = useState('');
  const limit = 20;

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const params = { limit, offset: page * limit };
      if (symbol) params.symbol = symbol;
      
      const response = await apiService.getAnalyses(params);
      setAnalyses(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [page, symbol]);

  const columns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'symbol', 
      label: 'Symbol',
      render: (val) => <span className="font-mono text-doji-green">{val}</span>
    },
    { key: 'timeframe', label: 'Timeframe' },
    { 
      key: 'is_doji_detected', 
      label: 'Doji Detected',
      render: (val) => (
        <Badge variant={val ? 'success' : 'muted'}>
          {val ? 'YES' : 'NO'}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => {
        const variants = {
          'entry': 'success',
          'waiting': 'warning',
          'ignored': 'muted'
        };
        return <Badge variant={variants[val] || 'muted'}>{val?.toUpperCase()}</Badge>;
      }
    },
    { 
      key: 'modelResults', 
      label: 'Confidence',
      render: (results) => {
        if (!results || results.length === 0) return '-';
        const confidence = results[0]?.confidence || 0;
        return (
          <span className={`font-mono ${confidence >= 0.75 ? 'text-doji-green' : 'text-doji-text-muted'}`}>
            {(confidence * 100).toFixed(1)}%
          </span>
        );
      }
    },
    { 
      key: 'created_at', 
      label: 'Created',
      render: (val) => (
        <span className="text-doji-text-muted text-xs">
          {new Date(val).toLocaleString()}
        </span>
      )
    }
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader 
        title="AI Analyses" 
        subtitle={`${total} total analyses`}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => { setSymbol(e.target.value); setPage(0); }}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Symbols</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
            </select>
            <Button variant="secondary" size="sm" onClick={fetchAnalyses}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="card">
        <DataTable 
          columns={columns}
          data={analyses}
          loading={loading}
        />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-doji-border flex items-center justify-between">
            <span className="text-sm text-doji-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
