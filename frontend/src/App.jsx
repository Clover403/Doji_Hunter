import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Analyses from './pages/Analyses';
import Orders from './pages/Orders';
import Candles from './pages/Candles';
import Settings from './pages/Settings';

function App() {
  try {
    return (
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyses" element={<Analyses />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/candles" element={<Candles />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return (
      <div style={{color: 'red', padding: '20px', background: '#050505'}}>
        <h1>❌ APP ERROR</h1>
        <p>{error.message}</p>
      </div>
    );
  }
}

export default App;
