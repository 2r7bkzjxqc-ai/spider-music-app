#!/usr/bin/env node
/**
 * Simple HTTP server to serve index.html locally
 * Points to Railway backend for API calls
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const RAILWAY_URL = 'https://spidermusic.up.railway.app';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let filePath = path.join(__dirname, parsedUrl.pathname);

  // Default to index.html if root
  if (parsedUrl.pathname === '/') {
    filePath = path.join(__dirname, 'index.html');
  }

  // Serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.jpg') contentType = 'image/jpeg';
    if (ext === '.svg') contentType = 'image/svg+xml';

    // Modify HTML to point to Railway backend
    let content = data.toString();
    if (ext === '.html') {
      // This is handled by index.html using window.location.origin
      // But we can optionally inject the Railway URL here
      content = content.replace(
        /const ACTIVE_SERVER = window\.location\.origin/,
        `const ACTIVE_SERVER = '${RAILWAY_URL}'`
      );
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎵 Spider Music Local Server`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔗 Backend: ${RAILWAY_URL}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
