const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env vars
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '2gb' }));
app.use(express.static(__dirname));

// Simple health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple root route
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } else {
            res.send('<h1>🎵 Spider Music</h1><p>Server is running. index.html will be loaded soon.</p>');
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
});

// MongoDB connection (optional for now)
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    console.log('📡 Attempting MongoDB connection...');
    mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        connectTimeoutMS: 5000,
    }).then(() => {
        console.log('✅ MongoDB connected');
    }).catch(err => {
        console.warn('⚠️  MongoDB connection failed (continuing without DB):', err.message);
    });
} else {
    console.warn('⚠️  MONGODB_URI not set - running without database');
}

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Ready to receive requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down');
    server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
