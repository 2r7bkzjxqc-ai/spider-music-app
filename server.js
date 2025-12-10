#!/usr/bin/env node
process.stdout.write('✅ NODE STARTING\n');

const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const app = express();

process.stdout.write(`✅ PORT=${PORT}\n`);

// Health endpoint - MUST BE FIRST
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root
app.get('/', (req, res) => {
  const file = path.join(__dirname, 'index.html');
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.send('<h1>Spider Music</h1>');
  }
});

// API
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use(express.static(__dirname));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Start
const server = app.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`🚀 SERVER ON PORT ${PORT}\n`);
});

server.on('error', (err) => {
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  process.stderr.write(`CRASH: ${err.message}\n`);
  process.exit(1);
});
