const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎬 Minimal server starting...');

// Serve static files
app.use(express.static(__dirname));

// Root route
app.get('/', (req, res) => {
    console.log('📨 GET / request received');
    try {
        const indexPath = path.join(__dirname, 'index.html');
        console.log(`📄 Looking for index.html at: ${indexPath}`);
        
        if (fs.existsSync(indexPath)) {
            console.log('✅ index.html found, reading...');
            const html = fs.readFileSync(indexPath, 'utf8');
            console.log(`📊 Read ${html.length} bytes`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
            console.log('✅ Response sent');
        } else {
            console.log('❌ index.html not found');
            res.send('<h1>Spider Music</h1><p>Server is running!</p>');
        }
    } catch (err) {
        console.error('❌ Error in GET /:', err.message);
        res.status(500).send('Error: ' + err.message);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Uncaught error:', err);
    res.status(500).json({ error: err.message });
});

// 404
app.use((req, res) => {
    console.log(`⚠️  404: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Not found' });
});

// Start
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Minimal server running on port ${PORT}`);
    console.log(`✅ Ready for requests`);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
});
