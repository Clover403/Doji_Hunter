const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'running' });
});

const server = app.listen(3000, () => {
  console.log('Test server running on port 3000');
});

// Keep alive
setInterval(() => {
  console.log('Server still running...');
}, 10000);
