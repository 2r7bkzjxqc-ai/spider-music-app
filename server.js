#!/usr/bin/env node
process.stdout.write('✅ NODE STARTING\n');

// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
const app = express();

process.stdout.write(`✅ PORT=${PORT}\n`);

// ==================== DECRYPTION HELPER ====================

function decryptFile(filePath, encryptionKey) {
  const encPath = filePath + '.enc';
  
  // If plain file exists, use it (for local dev)
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  // If encrypted file exists, decrypt it
  if (fs.existsSync(encPath) && encryptionKey) {
    try {
      const data = fs.readFileSync(encPath, 'utf8');
      const [ivHex, encrypted] = data.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (err) {
      process.stdout.write(`⚠️  Failed to decrypt ${filePath}: ${err.message}\n`);
      return [];
    }
  }
  
  return [];
}

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ==================== MULTER SETUP ====================
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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
  album: String,
  cover: String,
  src: String,                  // URL audio (local, Cloudinary, ou SoundCloud)
  audioData: String,            // Base64 encoded audio data
  audioSize: Number,            // Size in bytes
  platform: { type: String, default: 'local' }, // 'local', 'cloudinary', 'soundcloud'
  externalId: String,          // SoundCloud track ID or Cloudinary ID
  externalUrl: String,         // Link to original source (SoundCloud permalink)
  duration: Number,            // Duration in milliseconds
  likes: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const playlistSchema = new mongoose.Schema({
  name: String,
  owner: String,
  songs: [String],
  isPublic: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  author: String,
  content: String,
  likes: [String],
  comments: [String],
  createdAt: { type: Date, default: Date.now }
});

const genreSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const artistSchema = new mongoose.Schema({
  name: String,
  avatar: String,
  bio: String,
  followers: [String],
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  user: String,
  type: String,
  message: String,
  read: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);
const Post = mongoose.model('Post', postSchema);
const Genre = mongoose.model('Genre', genreSchema);
const Artist = mongoose.model('Artist', artistSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// ==================== HELPERS ====================

function loadJSON(filePath) {
  try {
    return decryptFile(filePath, ENCRYPTION_KEY);
  } catch (err) {
    process.stdout.write(`⚠️  loadJSON error for ${filePath}: ${err.message}\n`);
    return [];
  }
}

// ==================== DATA MIGRATION ====================

async function migrateData() {
  try {
    // FORCE DELETE AND RECREATE
    process.stdout.write('🔄 Clearing existing data...\n');
    await User.deleteMany({});
    await Song.deleteMany({});
    await Playlist.deleteMany({});
    await Post.deleteMany({});
    await Genre.deleteMany({});
    await Artist.deleteMany({});
    await Notification.deleteMany({});

    process.stdout.write(`📥 Migrating data...\n`);

    const users = loadJSON(path.join(__dirname, 'users.json'));
    if (users.length > 0) {
      try {
        const inserted = await User.insertMany(users);
        process.stdout.write(`✅ ${inserted.length} users inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ User insert error: ${err.message}\n`);
      }
    }

    const songs = loadJSON(path.join(__dirname, 'songs.json'));
    if (songs.length > 0) {
      try {
        const inserted = await Song.insertMany(songs);
        process.stdout.write(`✅ ${inserted.length} songs inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Song insert error: ${err.message}\n`);
      }
    }

    const playlists = loadJSON(path.join(__dirname, 'playlists.json'));
    if (playlists.length > 0) {
      try {
        const inserted = await Playlist.insertMany(playlists);
        process.stdout.write(`✅ ${inserted.length} playlists inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Playlist insert error: ${err.message}\n`);
      }
    }

    const posts = loadJSON(path.join(__dirname, 'posts.json'));
    if (posts.length > 0) {
      try {
        const inserted = await Post.insertMany(posts);
        process.stdout.write(`✅ ${inserted.length} posts inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Post insert error: ${err.message}\n`);
      }
    }

    const genres = loadJSON(path.join(__dirname, 'genres.json'));
    if (genres.length > 0) {
      try {
        const inserted = await Genre.insertMany(genres);
        process.stdout.write(`✅ ${inserted.length} genres inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Genre insert error: ${err.message}\n`);
      }
    }

    const artists = loadJSON(path.join(__dirname, 'artists.json'));
    if (artists.length > 0) {
      try {
        const inserted = await Artist.insertMany(artists);
        process.stdout.write(`✅ ${inserted.length} artists inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Artist insert error: ${err.message}\n`);
      }
    }

    const notifications = loadJSON(path.join(__dirname, 'notifications.json'));
    if (notifications.length > 0) {
      try {
        const inserted = await Notification.insertMany(notifications);
        process.stdout.write(`✅ ${inserted.length} notifications inserted\n`);
      } catch (err) {
        process.stdout.write(`⚠️ Notification insert error: ${err.message}\n`);
      }
    }

    // Verify
    const userCount = await User.countDocuments();
    const songCount = await Song.countDocuments();
    process.stdout.write(`✅ Final count: ${userCount} users, ${songCount} songs\n`);

  } catch (err) {
    process.stderr.write(`❌ Migration failed: ${err.message}\n`);
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

// ==================== EXTERNAL MUSIC SOURCES ====================

// TEST CLOUDINARY CONFIG
app.get('/api/test/cloudinary', async (req, res) => {
  try {
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key) {
      return res.status(500).json({ 
        error: 'Cloudinary not configured',
        config: {
          cloud_name: config.cloud_name || 'NOT SET',
          api_key: config.api_key ? '***' : 'NOT SET'
        }
      });
    }
    res.json({ 
      status: 'Cloudinary configured ✅',
      cloud_name: config.cloud_name,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'NOT SET'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH SOUNDCLOUD TRACKS
app.get('/api/soundcloud/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    
    // Note: Direct SoundCloud API integration requires proper setup
    // For now, return placeholder
    res.json({ 
      message: 'SoundCloud search endpoint',
      status: 'requires-setup',
      note: 'Configure SOUNDCLOUD_CLIENT_ID environment variable'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPLOAD AUDIO FILE TO CLOUDINARY
app.post('/api/upload/audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { title, artist, album } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Convert file buffer to base64
    const audioBase64 = req.file.buffer.toString('base64');
    const audioSize = req.file.buffer.length;
    
    // Create song entry with audio data in MongoDB
    const song = new Song({
      title,
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      cover: 'https://via.placeholder.com/300/121212/FFFFFF?text=Uploaded',
      src: `/api/audio/${Date.now()}`, // Local reference
      audioData: audioBase64,
      audioSize,
      platform: 'mongodb',
      duration: 0,
      genre: 'Music'
    });

    await song.save();
    
    res.json({ 
      message: 'Audio uploaded successfully to MongoDB',
      song: {
        id: song._id,
        title: song.title,
        artist: song.artist,
        audioSize: audioSize,
        platform: 'mongodb'
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        duration: cloudinaryResult.duration
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.message.includes('Unknown') ? 'Invalid Cloudinary credentials. Check .env file.' : 'Upload failed'
    });
  }
});

// ADD SOUNDCLOUD TRACK TO DATABASE
app.post('/api/soundcloud/add', async (req, res) => {
  try {
    const { trackId, title, artist, cover, src, duration } = req.body;
    
    if (!trackId || !title || !src) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if track already exists
    const existing = await Song.findOne({ externalId: trackId, platform: 'soundcloud' });
    if (existing) {
      return res.status(409).json({ error: 'Track already in database' });
    }

    const song = new Song({
      title,
      artist: artist || 'Unknown Artist',
      cover: cover || 'https://via.placeholder.com/300/121212/FFFFFF?text=SoundCloud',
      src,
      platform: 'soundcloud',
      externalId: trackId,
      externalUrl: `https://soundcloud.com/${artist}/${title}`,
      duration: duration || 0,
      likes: [],
      genre: 'Music'
    });

    await song.save();
    res.json({ message: 'Track added successfully', song });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPLOAD TO CLOUDINARY ENDPOINT
app.post('/api/songs/upload-cloudinary', async (req, res) => {
  try {
    const { title, artist, cover, cloudinaryUrl, duration = 0 } = req.body;
    
    if (!title || !cloudinaryUrl) {
      return res.status(400).json({ error: 'Missing title or cloudinaryUrl' });
    }

    const song = new Song({
      title,
      artist: artist || 'Unknown Artist',
      cover: cover || 'https://via.placeholder.com/300/121212/FFFFFF?text=Uploaded',
      src: cloudinaryUrl,
      platform: 'cloudinary',
      externalId: cloudinaryUrl.split('/').pop(),
      duration,
      likes: [],
      genre: 'Music'
    });

    await song.save();
    res.json({ message: 'Song uploaded successfully', song });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL USER UPLOADED SONGS
app.get('/api/songs/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const songs = await Song.find({ platform }).limit(100);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// GET PLAYLIST BY ID
app.get('/api/playlists/:id', playlistByIdHandler);
app.get('/playlists/:id', playlistByIdHandler);

async function playlistByIdHandler(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ADD SONG TO PLAYLIST
app.post('/api/playlists/:id/songs', addSongToPlaylistHandler);
app.post('/playlists/:id/songs', addSongToPlaylistHandler);

async function addSongToPlaylistHandler(req, res) {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      await playlist.save();
    }
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// REMOVE SONG FROM PLAYLIST
app.delete('/api/playlists/:id/songs/:songId', removeSongFromPlaylistHandler);
app.delete('/playlists/:id/songs/:songId', removeSongFromPlaylistHandler);

async function removeSongFromPlaylistHandler(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    playlist.songs = playlist.songs.filter(s => s !== req.params.songId);
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET POSTS
app.get('/api/posts', postsHandler);
app.get('/posts', postsHandler);

async function postsHandler(req, res) {
  try {
    const posts = await Post.find().limit(500);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET GENRES
app.get('/api/genres', genresHandler);
app.get('/genres', genresHandler);

async function genresHandler(req, res) {
  try {
    const genres = await Genre.find().limit(100);
    res.json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE GENRE
app.post('/api/genres', createGenreHandler);
app.post('/genres', createGenreHandler);

async function createGenreHandler(req, res) {
  try {
    const genre = new Genre(req.body);
    await genre.save();
    res.json(genre);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE GENRE
app.delete('/api/genres/:name', deleteGenreHandler);
app.delete('/genres/:name', deleteGenreHandler);

async function deleteGenreHandler(req, res) {
  try {
    const result = await Genre.deleteOne({ name: req.params.name });
    res.json({ success: result.deletedCount > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET ARTISTS
app.get('/api/artists', artistsHandler);
app.get('/artists', artistsHandler);

async function artistsHandler(req, res) {
  try {
    const artists = await Artist.find().limit(100);
    res.json(artists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE ARTIST
app.post('/api/artists', createArtistHandler);
app.post('/artists', createArtistHandler);

async function createArtistHandler(req, res) {
  try {
    const artist = new Artist(req.body);
    await artist.save();
    res.json(artist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET ARTIST BY NAME
app.get('/api/artists/:name', artistByNameHandler);
app.get('/artists/:name', artistByNameHandler);

async function artistByNameHandler(req, res) {
  try {
    const artist = await Artist.findOne({ name: req.params.name });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET NOTIFICATIONS
app.get('/api/notifications', notificationsHandler);
app.get('/notifications', notificationsHandler);

async function notificationsHandler(req, res) {
  try {
    const notifications = await Notification.find().limit(500);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE NOTIFICATION
app.delete('/api/notifications/:id', deleteNotificationHandler);
app.delete('/notifications/:id', deleteNotificationHandler);

async function deleteNotificationHandler(req, res) {
  try {
    const result = await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: !!result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET POSTS
app.get('/api/posts', postsHandler);
app.get('/posts', postsHandler);

async function postsHandler(req, res) {
  try {
    const posts = await Post.find().limit(500);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE POST
app.post('/api/posts', createPostHandler);
app.post('/posts', createPostHandler);

async function createPostHandler(req, res) {
  try {
    const post = new Post(req.body);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE POST
app.delete('/api/posts/:id', deletePostHandler);
app.delete('/posts/:id', deletePostHandler);

async function deletePostHandler(req, res) {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    res.json({ success: !!result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// LIKE POST
app.post('/api/posts/:id/like', likePostHandler);
app.post('/posts/:id/like', likePostHandler);

async function likePostHandler(req, res) {
  try {
    const { username } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (!post.likes.includes(username)) {
      post.likes.push(username);
      await post.save();
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET USER PROFILE BY USERNAME
app.get('/api/users/profile/:username', userProfileHandler);
app.get('/users/profile/:username', userProfileHandler);

async function userProfileHandler(req, res) {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// UPDATE USER PROFILE
app.put('/api/users/profile', updateUserProfileHandler);
app.put('/users/profile', updateUserProfileHandler);

async function updateUserProfileHandler(req, res) {
  try {
    const { username, ...updateData } = req.body;
    const user = await User.findOneAndUpdate({ username }, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// FOLLOW USER
app.post('/api/users/follow', followUserHandler);
app.post('/users/follow', followUserHandler);

async function followUserHandler(req, res) {
  try {
    const { follower, following } = req.body;
    const user = await User.findOne({ username: follower });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.following.includes(following)) {
      user.following.push(following);
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// LIKE SONG
app.post('/api/songs/:id/like', likeSongHandler);
app.post('/songs/:id/like', likeSongHandler);

async function likeSongHandler(req, res) {
  try {
    const { username } = req.body;
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    
    if (!song.likes.includes(username)) {
      song.likes.push(username);
      await song.save();
    }
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// SERVE AUDIO FROM MongoDB
app.get('/api/audio/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song || !song.audioData) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    // Convert base64 back to buffer
    const audioBuffer = Buffer.from(song.audioData, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVE AUDIO FILES - Direct route
app.get('/audio/:filename', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', 'audio', req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVE AUDIO FILES - Legacy path
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads', 'audio')));

// SERVE STATIC FILES
app.use(express.static(__dirname));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// ==================== STARTUP ====================

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      process.stdout.write('⚠️  WARNING: MONGODB_URI not set! Using demo mode.\n');
      // Start server anyway without MongoDB
      const server = app.listen(PORT, '0.0.0.0', () => {
        process.stdout.write(`🚀 SERVER ON PORT ${PORT} (DEMO MODE)\n`);
        process.stdout.write('⚠️  No database connection\n');
      });
      return;
    }

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
    // Don't exit - try to start server anyway
    process.stdout.write('⚠️  Attempting to start server without database...\n');
    const server = app.listen(PORT, '0.0.0.0', () => {
      process.stdout.write(`🚀 SERVER ON PORT ${PORT} (FALLBACK MODE)\n`);
      process.stdout.write('⚠️  Database connection failed\n');
    });
  }
}

process.on('uncaughtException', (err) => {
  process.stderr.write(`CRASH: ${err.message}\n`);
  process.exit(1);
});

start();
