#!/usr/bin/env node

// Railway should only serve the frontend (index.html) and static assets.
// All API calls must go to your PC (through a tunnel URL configured in the browser).

const express = require('express');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.disable('x-powered-by');

// Serve static files in this folder (index.html + any local assets)
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders(res) {
    // Avoid caching during active development
    res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// For SPA-like navigation, always return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`🚆 Railway static server on port ${PORT}`);
});
