export function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-doji-text-muted">{title}</p>
            <p className="text-2xl font-semibold text-white mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-doji-text-muted mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <p className={`text-xs mt-2 ${trendUp ? 'text-doji-green' : 'text-doji-red'}`}>
                {trendUp ? '↑' : '↓'} {trend}
              </p>
            )}
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-doji-light-gray flex items-center justify-center">
              <Icon className="w-5 h-5 text-doji-text-muted" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataTable({ columns, data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-doji-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-doji-text-muted">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ variant = 'muted', children }) {
  const variants = {
    success: 'badge-success',
    danger: 'badge-danger',
    info: 'badge-info',
    warning: 'badge-warning',
    muted: 'badge-muted'
  };

  return (
    <span className={`badge ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, loading }) {
  const variants = {
    primary: 'bg-doji-green hover:bg-doji-green-muted text-white',
    secondary: 'bg-doji-gray hover:bg-doji-light-gray text-white border border-doji-border',
    danger: 'bg-doji-red/20 hover:bg-doji-red/30 text-doji-red'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
      `}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-doji-text-muted mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
