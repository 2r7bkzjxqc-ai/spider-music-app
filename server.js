const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== LOGGING ====================
console.log('🎵 Spider Music Server Starting...');
console.log(`📍 PORT: ${PORT}`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== DATABASE SCHEMAS ====================

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: String,
  avatar: String,
  followers: [String],
  following: [String],
  createdAt: { type: Date, default: Date.now }
});

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  genre: String,
  album: String,
  cover: String,
  src: String,
  likes: [String],
  createdAt: { type: Date, default: Date.now }
});

const playlistSchema = new mongoose.Schema({
  name: String,
  owner: String,
  songs: [String],
  isPublic: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);

// ==================== HELPERS ====================

function loadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`⚠️  Could not load ${filePath}`);
    return [];
  }
}

// ==================== DATA MIGRATION ====================

async function migrateData() {
  try {
    const userCount = await User.countDocuments();
    const songCount = await Song.countDocuments();

    if (userCount > 0 && songCount > 0) {
      console.log(`✅ Data exists: ${userCount} users, ${songCount} songs`);
      return;
    }

    console.log('📥 Migrating data from JSON files...');

    const users = loadJSON(path.join(__dirname, 'users.json'));
    if (users.length > 0) {
      await User.insertMany(users, { ordered: false }).catch(() => {});
      console.log(`✅ Migrated ${users.length} users`);
    }

    const songs = loadJSON(path.join(__dirname, 'songs.json'));
    if (songs.length > 0) {
      await Song.insertMany(songs, { ordered: false }).catch(() => {});
      console.log(`✅ Migrated ${songs.length} songs`);
    }

    const playlists = loadJSON(path.join(__dirname, 'playlists.json'));
    if (playlists.length > 0) {
      await Playlist.insertMany(playlists, { ordered: false }).catch(() => {});
      console.log(`✅ Migrated ${playlists.length} playlists`);
    }
  } catch (err) {
    console.error('⚠️  Migration error:', err.message);
  }
}

// ==================== ROUTES ====================

// Serve index.html on root
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  } else {
    res.send('<h1>🎵 Spider Music</h1><p>Server running!</p>');
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const users = await User.countDocuments();
    const songs = await Song.countDocuments();
    res.json({
      status: 'ok',
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      data: { users, songs }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find().limit(1000);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get song by ID
app.get('/api/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').limit(100);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await Playlist.find();
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static files - AFTER API routes
app.use(express.static(__dirname));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ==================== STARTUP ====================

async function start() {
  try {
    const MONGODB_URI = 'mongodb+srv://xdhnexvk_db_user:0LuFkTEqSbciy1GG@cluster0.bsyygmm.mongodb.net/spider-music?retryWrites=true&w=majority';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB connected');

    // Migrate data
    await migrateData();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server ready on port ${PORT}`);
      console.log(`✅ Visit: https://spidermusic.up.railway.app`);
    });

    // Timeouts for Railway
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Handle errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('📴 Shutting down...');
      server.close(() => {
        mongoose.connection.close(() => {
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

start();
