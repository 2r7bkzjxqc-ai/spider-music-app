const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('='.repeat(50));
console.log('🎵 SPIDER MUSIC SERVER');
console.log('='.repeat(50));
console.log(`⏰ Time: ${new Date().toISOString()}`);
console.log(`📍 process.env.PORT: ${process.env.PORT}`);
console.log(`📍 Listening on: ${PORT}`);
console.log(`📁 Working dir: ${__dirname}`);
console.log('='.repeat(50));

// ==================== ROUTES ====================

app.get('/', (req, res) => {
  console.log(`✅ GET / - Serving index.html`);
  const indexPath = path.join(__dirname, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`❌ index.html not found at ${indexPath}`);
    return res.status(404).send('<h1>❌ index.html not found</h1>');
  }
  
  try {
    const html = fs.readFileSync(indexPath, 'utf8');
    console.log(`✅ Read ${html.length} bytes`);
    res.type('text/html').send(html);
  } catch (err) {
    console.error(`❌ Error reading index.html: ${err.message}`);
    res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
  }
});

app.get('/api/health', (req, res) => {
  console.log(`✅ GET /api/health`);
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    port: PORT,
    env: process.env.PORT ? 'from ENV' : 'default'
  });
});

app.get('/api/songs', (req, res) => {
  console.log(`✅ GET /api/songs`);
  res.json([
    { id: 1, title: 'Test Song 1', artist: 'Artist 1' },
    { id: 2, title: 'Test Song 2', artist: 'Artist 2' }
  ]);
});

app.use(express.static(__dirname));

app.use((req, res) => {
  console.log(`⚠️  404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(`❌ ERROR: ${err.message}`);
  res.status(500).json({ error: err.message });
});

// ==================== START ====================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 SERVER STARTED ON PORT ${PORT}`);
  console.log('='.repeat(50));
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  console.error(`❌ SERVER ERROR: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`❌ UNCAUGHT: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(`❌ REJECTION: ${err}`);
  process.exit(1);
});
