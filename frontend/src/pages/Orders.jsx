import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { DataTable, Badge, Button, PageHeader } from '../components/ui';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ symbol: '', result: '' });
  const limit = 20;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { limit, offset: page * limit, ...filters };
      // Remove empty params
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await apiService.getOrders(params);
      setOrders(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, filters]);

  const columns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'order_ticket', 
      label: 'Ticket',
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    { 
      key: 'symbol', 
      label: 'Symbol',
      render: (val) => <span className="font-mono text-doji-green">{val}</span>
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (val) => (
        <Badge variant={val === 'BUY' ? 'success' : 'danger'}>
          {val}
        </Badge>
      )
    },
    { 
      key: 'entry_price', 
      label: 'Entry',
      render: (val) => <span className="font-mono">{val?.toFixed(5)}</span>
    },
    { 
      key: 'sl', 
      label: 'SL',
      render: (val) => <span className="font-mono text-doji-red">{val?.toFixed(5)}</span>
    },
    { 
      key: 'tp', 
      label: 'TP',
      render: (val) => <span className="font-mono text-doji-green">{val?.toFixed(5)}</span>
    },
    { 
      key: 'profit_pips', 
      label: 'Profit (Pips)',
      render: (val, row) => {
        if (val === null || val === undefined) return '-';
        const isPositive = val >= 0;
        return (
          <span className={`font-mono ${isPositive ? 'text-doji-green' : 'text-doji-red'}`}>
            {isPositive ? '+' : ''}{val?.toFixed(1)}
          </span>
        );
      }
    },
    { 
      key: 'result', 
      label: 'Result',
      render: (val) => {
        const variants = {
          'OPEN': 'info',
          'WON': 'success',
          'LOST': 'danger'
        };
        return <Badge variant={variants[val] || 'muted'}>{val}</Badge>;
      }
    },
    { 
      key: 'created_at', 
      label: 'Opened',
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
        title="Orders" 
        subtitle={`${total} total orders`}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={filters.symbol}
              onChange={(e) => { setFilters(f => ({ ...f, symbol: e.target.value })); setPage(0); }}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Symbols</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
            </select>
            <select
              value={filters.result}
              onChange={(e) => { setFilters(f => ({ ...f, result: e.target.value })); setPage(0); }}
              className="bg-doji-gray border border-doji-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Results</option>
              <option value="OPEN">Open</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
            <Button variant="secondary" size="sm" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="card">
        <DataTable 
          columns={columns}
          data={orders}
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
