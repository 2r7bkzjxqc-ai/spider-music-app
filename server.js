const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting test server...');
console.log('PORT env:', process.env.PORT);
console.log('Using PORT:', PORT);

// Just serve index.html
app.get('/', (req, res) => {
  console.log('GET / received');
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    res.send(html);
  } else {
    res.send('<h1>Test Server Running</h1>');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
  console.log('Ready!');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught error:', err);
});
