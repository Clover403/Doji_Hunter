import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('🚀 Main.jsx loading...');

try {
  const rootElement = document.getElementById('root');
  console.log('🌱 Root element found:', rootElement);
  
  const root = ReactDOM.createRoot(rootElement);
  console.log('📦 Root created successfully');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('🎉 App rendered successfully');
} catch (error) {
  console.error('❌ Error in main.jsx:', error);
  document.body.innerHTML = `
    <div style="color: red; font-family: Arial; padding: 20px;">
      <h1>❌ FRONTEND ERROR</h1>
      <p>Error: ${error.message}</p>
      <p>Stack: ${error.stack}</p>
    </div>
  `;
}
