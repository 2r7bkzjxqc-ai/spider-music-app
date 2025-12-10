#!/usr/bin/env node

// FORCE OUTPUT IMMEDIATELY
process.stdout.write('✅ STEP 1: Script started\n');

const express = require('express');
process.stdout.write('✅ STEP 2: Express loaded\n');

const path = require('path');
const fs = require('fs');
process.stdout.write('✅ STEP 3: Modules loaded\n');

const app = express();
const PORT = process.env.PORT || 3000;

process.stdout.write(`✅ STEP 4: PORT = ${PORT}\n`);

// ==================== ROUTES ====================

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>🎵 Spider Music</h1><p>App running on port ' + PORT + '</p>');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ==================== START ====================

process.stdout.write('✅ STEP 5: Routes defined\n');

const server = app.listen(PORT, () => {
  process.stdout.write(`✅ STEP 6: SERVER LISTENING ON PORT ${PORT}\n`);
  process.stdout.write('🎵 READY FOR REQUESTS\n');
});

process.stdout.write('✅ STEP 5B: listen() called\n');

server.on('error', (err) => {
  process.stderr.write(`❌ SERVER ERROR: ${err.message}\n`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  process.stderr.write(`❌ UNCAUGHT: ${err.message}\n`);
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  process.stderr.write(`❌ REJECTION: ${err}\n`);
  process.exit(1);
});
