const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎬 Minimal server starting...');
console.log(`📍 PORT: ${PORT}`);
console.log(`📁 Working dir: ${__dirname}`);

// Middleware BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Root route - explicit handler BEFORE static
app.get('/', (req, res) => {
    console.log('📨 GET / handler called');
    try {
        const indexPath = path.join(__dirname, 'index.html');
        console.log(`📄 Checking: ${indexPath}`);
        
        if (!fs.existsSync(indexPath)) {
            console.log('❌ index.html not found, sending fallback');
            return res.send('<h1>🎵 Spider Music</h1><p>Server is running! index.html not found.</p>');
        }
        
        console.log('✅ Reading index.html...');
        const html = fs.readFileSync(indexPath, 'utf8');
        console.log(`✅ Read ${html.length} bytes, sending...`);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        console.log('✅ index.html sent successfully');
    } catch (err) {
        console.error('❌ ERROR in GET /:', err.message);
        console.error(err.stack);
        res.status(500).send('<h1>Error</h1><pre>' + err.message + '</pre>');
    }
});

// Static files AFTER root route
app.use(express.static(__dirname, {
    maxAge: '1h',
    etag: false
}));

// API routes
app.get('/api/health', (req, res) => {
    console.log('📨 GET /api/health');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Express error:', err);
    res.status(500).json({ error: err.message });
});

// 404
app.use((req, res) => {
    console.log(`⚠️  404: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Ready to receive requests`);
});

process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
});

server.on('error', (err) => {
    console.error('❌ SERVER ERROR:', err);
});
