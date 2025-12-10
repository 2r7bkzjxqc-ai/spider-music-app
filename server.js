#!/usr/bin/env node
process.stdout.write('✅ NODE STARTING\n');

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const app = express();

process.stdout.write(`✅ PORT=${PORT}\n`);

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
    return [];
  }
}

// ==================== DATA MIGRATION ====================

async function migrateData() {
  try {
    const userCount = await User.countDocuments();
    const songCount = await Song.countDocuments();

    if (userCount > 0 && songCount > 0) {
      process.stdout.write(`✅ Data exists\n`);
      return;
    }

    process.stdout.write(`📥 Migrating data...\n`);

    const users = loadJSON(path.join(__dirname, 'users.json'));
    if (users.length > 0) {
      try {
        await User.insertMany(users, { ordered: false });
        process.stdout.write(`✅ ${users.length} users migrated\n`);
      } catch (err) {
        // Ignore duplicates
      }
    }

    const songs = loadJSON(path.join(__dirname, 'songs.json'));
    if (songs.length > 0) {
      try {
        await Song.insertMany(songs, { ordered: false });
        process.stdout.write(`✅ ${songs.length} songs migrated\n`);
      } catch (err) {
        // Ignore duplicates
      }
    }

    const playlists = loadJSON(path.join(__dirname, 'playlists.json'));
    if (playlists.length > 0) {
      try {
        await Playlist.insertMany(playlists, { ordered: false });
        process.stdout.write(`✅ ${playlists.length} playlists migrated\n`);
      } catch (err) {
        // Ignore duplicates
      }
    }
  } catch (err) {
    process.stderr.write(`⚠️ Migration error: ${err.message}\n`);
  }
}

// ==================== ROUTES ====================

// Health check (for Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root - serve index.html
app.get('/', (req, res) => {
  const file = path.join(__dirname, 'index.html');
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.send('<h1>Spider Music</h1>');
  }
});

// ==================== API ROUTES ====================

// Health API
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

// LOGIN - BOTH PATHS
app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// REGISTER - BOTH PATHS
app.post('/api/auth/register', registerHandler);
app.post('/auth/register', registerHandler);

async function registerHandler(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'User exists' });
    }

    const user = new User({ username, password });
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET ALL SONGS
app.get('/api/songs', songsHandler);
app.get('/songs', songsHandler);

async function songsHandler(req, res) {
  try {
    const songs = await Song.find().limit(500);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET SONG BY ID
app.get('/api/songs/:id', songByIdHandler);
app.get('/songs/:id', songByIdHandler);

async function songByIdHandler(req, res) {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET ALL USERS
app.get('/api/users', usersHandler);
app.get('/users', usersHandler);

async function usersHandler(req, res) {
  try {
    const users = await User.find().select('-password').limit(100);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET USER BY ID
app.get('/api/users/:id', userByIdHandler);
app.get('/users/:id', userByIdHandler);

async function userByIdHandler(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET ALL PLAYLISTS
app.get('/api/playlists', playlistsHandler);
app.get('/playlists', playlistsHandler);

async function playlistsHandler(req, res) {
  try {
    const playlists = await Playlist.find().limit(200);
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE PLAYLIST
app.post('/api/playlists', createPlaylistHandler);
app.post('/playlists', createPlaylistHandler);

async function createPlaylistHandler(req, res) {
  try {
    const playlist = new Playlist(req.body);
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Static files
app.use(express.static(__dirname));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// ==================== STARTUP ====================

async function start() {
  try {
    const MONGODB_URI = 'mongodb+srv://xdhnexvk_db_user:0LuFkTEqSbciy1GG@cluster0.bsyygmm.mongodb.net/spider-music?retryWrites=true&w=majority';

    process.stdout.write('🔗 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    process.stdout.write('✅ MongoDB connected\n');

    // Migrate data
    await migrateData();

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      process.stdout.write(`🚀 SERVER ON PORT ${PORT}\n`);
      process.stdout.write('✅ Ready for requests\n');
    });

    server.on('error', (err) => {
      process.stderr.write(`ERROR: ${err.message}\n`);
      process.exit(1);
    });
  } catch (err) {
    process.stderr.write(`FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  process.stderr.write(`CRASH: ${err.message}\n`);
  process.exit(1);
});

start();
