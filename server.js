const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎬 Spider Music Server starting...');
console.log(`📍 PORT: ${PORT}`);
console.log(`📁 Working dir: ${__dirname}`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ==================== DATABASE ====================

// Config Schema - pour stocker MongoDB URI, Cloudinary credentials, etc
const configSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});

const Config = mongoose.model('Config', configSchema);

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
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`⚠️  Error loading ${filePath}:`, err.message);
    return [];
  }
}

// ==================== MIGRATION ====================

async function migrateData() {
  try {
    console.log('📦 Checking MongoDB for existing data...');
    const userCount = await User.countDocuments();
    const songCount = await Song.countDocuments();

    if (userCount > 0 && songCount > 0) {
      console.log(`✅ Data already exists: ${userCount} users, ${songCount} songs`);
      return;
    }

    console.log('📥 Migrating data from JSON files...');

    // Load users
    const usersData = loadJSON(path.join(__dirname, 'users.json'));
    if (usersData.length > 0) {
      await User.insertMany(usersData);
      console.log(`✅ Migrated ${usersData.length} users`);
    }

    // Load songs
    const songsData = loadJSON(path.join(__dirname, 'songs.json'));
    if (songsData.length > 0) {
      await Song.insertMany(songsData);
      console.log(`✅ Migrated ${songsData.length} songs`);
    }

    // Load playlists
    const playlistsData = loadJSON(path.join(__dirname, 'playlists.json'));
    if (playlistsData.length > 0) {
      await Playlist.insertMany(playlistsData);
      console.log(`✅ Migrated ${playlistsData.length} playlists`);
    }

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

// ==================== ROUTES ====================

// Root - serve index.html
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } else {
            res.send('<h1>🎵 Spider Music</h1><p>Server is running!</p>');
        }
    } catch (err) {
        console.error('❌ Error serving index.html:', err.message);
        res.status(500).send('Error: ' + err.message);
    }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbOk = mongoose.connection.readyState === 1;
    const users = await User.countDocuments();
    const songs = await Song.countDocuments();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'disconnected',
      stats: { users, songs }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config routes - pour stocker/charger variables
app.get('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    if (!config) return res.status(404).json({ error: 'Not found' });
    res.json({ key: config.key, value: config.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static files - AFTER all API routes
app.use(express.static(__dirname, {
  maxAge: '1h',
  etag: false
}));

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ==================== STARTUP ====================

async function start() {
  try {
    // URI MongoDB - codée en dur (pas besoin de variables d'environnement!)
    const MONGODB_URI = 'mongodb+srv://xdhnexvk_db_user:0LuFkTEqSbciy1GG@cluster0.bsyygmm.mongodb.net/spider-music?retryWrites=true&w=majority';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log('✅ MongoDB connected');

    // Migrate data if needed
    await migrateData();

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Ready for requests`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Handle errors from server
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM - shutting down...');
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 SIGINT - shutting down...');
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Handle unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start();
