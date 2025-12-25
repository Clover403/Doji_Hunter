import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  ShoppingCart, 
  TrendingUp,
  Settings,
  Activity,
  Bot
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Analyses', href: '/analyses', icon: BarChart3 },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Candles', href: '/candles', icon: TrendingUp }, // Ganti Candlestick dengan TrendingUp
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-doji-darker flex">
      {/* Sidebar - Fixed position */}
      <aside className="w-64 bg-doji-dark border-r border-doji-border fixed top-0 left-0 h-screen flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-doji-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-doji-green/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-doji-green" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">DojiHunter</h1>
              <p className="text-xs text-doji-text-muted">AI Trading Bot</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-doji-green/10 text-doji-green border border-doji-green/20'
                    : 'text-doji-text-muted hover:text-white hover:bg-doji-gray'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Status Footer - Always at bottom */}
        <div className="p-4 border-t border-doji-border mt-auto">
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-4 h-4 text-doji-green animate-pulse-green" />
            <span className="text-doji-green">System Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content - With left margin to account for fixed sidebar */}
      <main className="flex-1 ml-64 overflow-auto min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
