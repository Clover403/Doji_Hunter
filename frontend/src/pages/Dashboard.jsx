import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { formatDateTime, formatTime, formatDate } from '../utils/dateHelper';
import { StatCard, DataTable, Badge, Button, PageHeader } from '../components/ui';
import { 
  BarChart3, 
  ShoppingCart, 
  Target, 
  TrendingUp,
  RefreshCw,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Debug date formatting (temporarily for testing)
  console.log('Date format examples:');
  console.log('Full format:', formatDateTime('2025-12-25T09:33:58.429Z')); // Should be "25/12/25, 09:33 AM"
  console.log('Time only:', formatTime('2025-12-25T14:45:22.123Z')); // Should be "02:45 PM"
  console.log('Date only:', formatDate('2025-12-25T09:33:58.429Z')); // Should be "25/12/25"

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualAnalysis = async () => {
    try {
      setAnalyzing(true);
      await apiService.triggerAnalysis();
      setTimeout(fetchStats, 2000); // Refresh after 2 seconds
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const analysisColumns = [
    { key: 'id', label: 'ID' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'timeframe', label: 'TF' },
    { 
      key: 'is_doji_detected', 
      label: 'Doji',
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
      key: 'createdAt',  // Fix: backend camelCase
      label: 'Time',
      render: (val) => formatDateTime(val)
    }
  ];

  const orderColumns = [
    { key: 'id', label: 'ID' },
    { key: 'symbol', label: 'Symbol' },
    { 
      key: 'type', 
      label: 'Type',
      render: (val) => (
        <Badge variant={val === 'BUY' ? 'success' : 'danger'}>
          {val}
        </Badge>
      )
    },
    { key: 'entry_price', label: 'Entry', render: (val) => val?.toFixed(5) },
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
      key: 'createdAt',  // Fix: backend camelCase
      label: 'Time',
      render: (val) => formatDateTime(val)
    }
  ];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-doji-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <p className="text-doji-red mb-4">Error: {error}</p>
          <Button onClick={fetchStats}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Real-time overview of DojiHunter AI Trading Bot"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={fetchStats}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleManualAnalysis} loading={analyzing}>
              <Zap className="w-4 h-4" />
              Analyze Now
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Analyses"
          value={stats?.stats?.totalAnalyses || 0}
          icon={BarChart3}
        />
        <StatCard
          title="Doji Detected"
          value={stats?.stats?.dojiDetected || 0}
          subtitle={`${stats?.stats?.dojiPercentage || 0}% detection rate`}
          icon={Target}
        />
        <StatCard
          title="Total Orders"
          value={stats?.stats?.totalOrders || 0}
          subtitle={`${stats?.stats?.openOrders || 0} open`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.stats?.winRate || 0}%`}
          subtitle={`${stats?.stats?.wonOrders || 0}W / ${stats?.stats?.lostOrders || 0}L`}
          icon={TrendingUp}
          trend={stats?.stats?.winRate > 50 ? 'Profitable' : 'Needs improvement'}
          trendUp={stats?.stats?.winRate > 50}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-medium text-white">Recent Analyses</h3>
          </div>
          <DataTable 
            columns={analysisColumns}
            data={stats?.recentAnalyses || []}
            loading={loading}
          />
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-medium text-white">Recent Orders</h3>
          </div>
          <DataTable 
            columns={orderColumns}
            data={stats?.recentOrders || []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
