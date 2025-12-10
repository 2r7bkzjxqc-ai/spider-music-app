const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎵 SPIDER MUSIC - Starting Server');
console.log(`📍 PORT: ${PORT}`);
console.log(`📁 DIR: ${__dirname}`);

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// Request logging
app.use((req, res, next) => {
  if (!req.path.startsWith('/uploads') && !req.path.includes('.')) {
    console.log(`➡️  ${req.method} ${req.path}`);
  }
  next();
});

// ==================== UPLOAD SETUP ====================
const uploadDir = path.join(__dirname, 'uploads', 'audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp3|wav|ogg|flac|m4a|mpeg)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// ==================== DATABASE SCHEMAS ====================

const configSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: String,
  password: String,
  avatar: String,
  banner: String,
  bio: String,
  followers: [String],
  following: [String],
  likedSongs: [mongoose.Schema.Types.ObjectId],
  createdAt: { type: Date, default: Date.now }
});

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: String,
  artistId: mongoose.Schema.Types.ObjectId,
  genre: String,
  genreId: mongoose.Schema.Types.ObjectId,
  album: String,
  cover: String,
  src: String,
  duration: Number,
  likes: [String],
  playCount: { type: Number, default: 0 },
  uploadedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: mongoose.Schema.Types.ObjectId,
  description: String,
  cover: String,
  songs: [mongoose.Schema.Types.ObjectId],
  isPublic: { type: Boolean, default: true },
  followers: [String],
  createdAt: { type: Date, default: Date.now }
});

const artistSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  avatar: String,
  bio: String,
  followers: [String],
  songs: [mongoose.Schema.Types.ObjectId]
});

const genreSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  icon: String,
  description: String
});

const Config = mongoose.model('Config', configSchema);
const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);
const Artist = mongoose.model('Artist', artistSchema);
const Genre = mongoose.model('Genre', genreSchema);

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
    const [userCount, songCount] = await Promise.all([
      User.countDocuments(),
      Song.countDocuments()
    ]);

    if (userCount > 0 && songCount > 0) {
      console.log(`✅ Data exists: ${userCount} users, ${songCount} songs`);
      return;
    }

    console.log('📥 Migrating data from JSON...');

    // Users
    const users = loadJSON(path.join(__dirname, 'users.json'));
    if (users.length > 0) {
      try {
        await User.insertMany(users, { ordered: false });
        console.log(`✅ ${users.length} users migrated`);
      } catch (err) {
        console.warn(`⚠️  User migration: ${err.message}`);
      }
    }

    // Songs
    const songs = loadJSON(path.join(__dirname, 'songs.json'));
    if (songs.length > 0) {
      try {
        await Song.insertMany(songs, { ordered: false });
        console.log(`✅ ${songs.length} songs migrated`);
      } catch (err) {
        console.warn(`⚠️  Song migration: ${err.message}`);
      }
    }

    // Genres
    const genres = loadJSON(path.join(__dirname, 'genres.json'));
    if (genres.length > 0) {
      try {
        await Genre.insertMany(genres, { ordered: false });
        console.log(`✅ ${genres.length} genres migrated`);
      } catch (err) {
        console.warn(`⚠️  Genre migration: ${err.message}`);
      }
    }

    // Playlists
    const playlists = loadJSON(path.join(__dirname, 'playlists.json'));
    if (playlists.length > 0) {
      try {
        await Playlist.insertMany(playlists, { ordered: false });
        console.log(`✅ ${playlists.length} playlists migrated`);
      } catch (err) {
        console.warn(`⚠️  Playlist migration: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

// ==================== ROUTES ====================

// Root - serve index.html
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  } else {
    res.send('<h1>🎵 Spider Music Server</h1><p>Running on ' + PORT + '</p>');
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [users, songs, playlists] = await Promise.all([
      User.countDocuments(),
      Song.countDocuments(),
      Playlist.countDocuments()
    ]);

    res.json({
      status: 'ok',
      server: 'running',
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      data: { users, songs, playlists }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SONGS ROUTES ====================

app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).limit(500);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/songs/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const song = new Song({
      title: req.body.title || req.file.originalname,
      artist: req.body.artist,
      genre: req.body.genre,
      album: req.body.album,
      cover: req.body.cover,
      src: `/uploads/audio/${req.file.filename}`,
      uploadedBy: req.body.userId
    });

    await song.save();
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USERS ROUTES ====================

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').limit(100);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PLAYLISTS ROUTES ====================

app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await Playlist.find().limit(200);
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlists', async (req, res) => {
  try {
    const playlist = new Playlist(req.body);
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== GENRES ROUTES ====================

app.get('/api/genres', async (req, res) => {
  try {
    const genres = await Genre.find();
    res.json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONFIG ROUTES ====================

app.get('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    res.json(config || { key: req.params.key, value: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATIC & UPLOADS ====================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Ready: https://spidermusic.up.railway.app`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

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
    console.error(err.stack);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

start();
