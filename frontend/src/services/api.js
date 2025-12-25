import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API Service methods
export const apiService = {
  // Health & Status
  getHealth: () => api.get('/'),
  getStatus: () => api.get('/status'),
  getConfig: () => api.get('/config'),

  // Dashboard
  getDashboardStats: () => api.get('/dashboard/stats'),

  // Analyses
  getAnalyses: (params = {}) => api.get('/analyses', { params }),
  getAnalysisById: (id) => api.get(`/analyses/${id}`),

  // Orders
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),

  // Model Results
  getModelResults: (params = {}) => api.get('/model-results', { params }),

  // Candles
  getCandles: (params = {}) => api.get('/candles', { params }),

  // Manual Analysis
  triggerAnalysis: (data = {}) => api.post('/analyze', data)
};

export default api;
