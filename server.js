const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Load env vars
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));
app.use(express.static(__dirname));

// ============= MODELS =============
// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    avatar: { type: String, default: '' },
    banner: { type: String, default: '' },
    followers: [{ type: String }],
    following: [{ type: String }],
    likedAlbums: [{ type: String }],
    isOnline: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Song Schema
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    genre: { type: String, default: '' },
    album: { type: String, default: '' },
    cover: { type: String, default: '' },
    src: { type: String, required: true },
    likes: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

// Playlist Schema
const playlistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: String, required: true },
    songs: [{ type: String }],
    description: { type: String, default: '' },
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Artist Schema
const artistSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    followers: { type: Number, default: 0 }
});

// Genre Schema
const genreSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true }
});

// Post Schema
const postSchema = new mongoose.Schema({
    author: { type: String, required: true },
    content: { type: String, required: true },
    likes: [{ type: String }],
    image: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    targetUser: { type: String, required: true },
    message: { type: String, required: true },
    sender: { type: String, default: 'System' },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);
const Artist = mongoose.model('Artist', artistSchema);
const Genre = mongoose.model('Genre', genreSchema);
const Post = mongoose.model('Post', postSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// ============= HELPERS =============
function hashPassword(password) {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return salt + ':' + hash;
}

function loadJSON(filePath) {
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
    } catch (e) {
        console.warn(`⚠️  Error reading ${filePath}:`, e.message);
        return [];
    }
}

// ============= ROUTES =============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all songs
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (err) {
        console.error('Error fetching songs:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all playlists
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.find();
        res.json(playlists);
    } catch (err) {
        console.error('Error fetching playlists:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all artists
app.get('/api/artists', async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (err) {
        console.error('Error fetching artists:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all genres
app.get('/api/genres', async (req, res) => {
    try {
        const genres = await Genre.find();
        res.json(genres.map(g => g.name));
    } catch (err) {
        console.error('Error fetching genres:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user notifications
app.get('/api/notifications/:username', async (req, res) => {
    try {
        const notifications = await Notification.find({ targetUser: req.params.username }).sort({ timestamp: -1 });
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create song
app.post('/api/songs', async (req, res) => {
    try {
        const { title, artist, genre, album, cover, src } = req.body;
        const song = new Song({ title, artist, genre, album, cover, src });
        await song.save();
        res.json({ success: true, song });
    } catch (err) {
        console.error('Error creating song:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create playlist
app.post('/api/playlists', async (req, res) => {
    try {
        const { name, owner, description, isPublic } = req.body;
        const playlist = new Playlist({ name, owner, description, isPublic, songs: [] });
        await playlist.save();
        res.json({ success: true, playlist });
    } catch (err) {
        console.error('Error creating playlist:', err);
        res.status(500).json({ error: err.message });
    }
});

// Root route - serve index.html
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
        console.error('Error serving root:', err.message);
        res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ============= STARTUP =============
async function start() {
    try {
        console.log('🎬 Server startup initiated');
        console.log('📡 Attempting MongoDB connection...');
        
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            console.warn('⚠️  MONGODB_URI not set - running without database');
            startServer();
            return;
        }

        console.log('🔗 URI configured, connecting...');
        
        try {
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
            console.log('✅ MongoDB connected');
        } catch (mongoErr) {
            console.error('⚠️  MongoDB connection failed, continuing without DB:', mongoErr.message);
            startServer();
            return;
        }

        // Check if data exists
        console.log('📊 Checking database contents...');
        const userCount = await User.countDocuments();
        const songCount = await Song.countDocuments();
        const genreCount = await Genre.countDocuments();
        console.log(`📊 DB Status: ${userCount} users, ${songCount} songs, ${genreCount} genres`);

        if (userCount === 0 || songCount === 0 || genreCount === 0) {
            console.log('🔄 MongoDB is empty. Loading data from JSON files...');
            
            const dataDir = __dirname;
            const users = loadJSON(path.join(dataDir, 'users.json'));
            const artists = loadJSON(path.join(dataDir, 'artists.json'));
            const songs = loadJSON(path.join(dataDir, 'songs.json'));
            const playlists = loadJSON(path.join(dataDir, 'playlists.json'));
            const genres = loadJSON(path.join(dataDir, 'genres.json'));
            const posts = loadJSON(path.join(dataDir, 'posts.json'));
            const notifications = loadJSON(path.join(dataDir, 'notifications.json'));

            console.log(`📥 Migrating ${users.length} users, ${songs.length} songs, ${genres.length} genres...`);

            // Migrate users with hashed passwords
            for (const user of users) {
                await User.findOneAndUpdate(
                    { username: user.username },
                    { ...user, password: hashPassword(user.password) },
                    { upsert: true }
                );
            }

            // Migrate other data
            for (const artist of artists) {
                await Artist.findOneAndUpdate({ name: artist.name }, artist, { upsert: true });
            }
            for (const song of songs) {
                await Song.findOneAndUpdate({ title: song.title, artist: song.artist }, song, { upsert: true });
            }
            for (const playlist of playlists) {
                await Playlist.findOneAndUpdate({ name: playlist.name, owner: playlist.owner }, playlist, { upsert: true });
            }
            for (const genre of genres) {
                await Genre.findOneAndUpdate({ name: genre.name || genre }, { name: genre.name || genre }, { upsert: true });
            }
            for (const post of posts) {
                await Post.findOneAndUpdate({ author: post.author, content: post.content }, post, { upsert: true });
            }
            for (const notif of notifications) {
                await Notification.findOneAndUpdate({ targetUser: notif.targetUser, message: notif.message }, notif, { upsert: true });
            }

            console.log('✅ Data migration complete!');
        } else {
            console.log(`ℹ️  MongoDB already has data (${userCount} users, ${songCount} songs). Skipping migration.`);
        }

        startServer();
    } catch (err) {
        console.error('❌ Startup error:', err.message);
        console.error(err.stack);
        // Don't exit, try to start server anyway
        startServer();
    }
}

function startServer() {
    console.log('🎯 Starting Express server...');
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`✅ Ready to receive requests`);
        console.log(`📍 Access at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        console.error('❌ Server error:', err);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📴 SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('⛔ SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });

    process.on('uncaughtException', (err) => {
        console.error('❌ Uncaught Exception:', err);
    });
}

start();
