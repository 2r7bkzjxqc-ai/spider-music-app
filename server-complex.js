const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Only load .env in development, not in production (Railway provides env vars)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Import models and auth helpers
const { User, Song, Playlist, Artist, Post, Notification, Genre } = require('./models');
const { hashPassword, verifyPassword, cleanUserData } = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// === CONFIGURATION ===
// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'spider-music',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
}

console.log('📡 Connecting to MongoDB Atlas...');
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});

// === MIDDLEWARE ===
app.use(cors());
app.use(bodyParser.json({ limit: '2gb' }));
app.use(bodyParser.urlencoded({ limit: '2gb', extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection tracking
let mongoConnected = false;
mongoose.connection.on('connected', () => {
    mongoConnected = true;
    console.log('✅ MongoDB connection established');
});
mongoose.connection.on('disconnected', () => {
    mongoConnected = false;
    console.error('❌ MongoDB connection lost');
});

// === MULTER CONFIGURATION ===
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/aac',
        'audio/x-m4a', 'audio/mp4', 'audio/opus', 'audio/x-ms-wma',
        'audio/x-aiff', 'audio/aiff', 'audio/x-ape', 'audio/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier audio non supporté'), false);
    }
};
const upload = multer({ storage, fileFilter });

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// === AUTHENTICATION ROUTES ===

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        const user = await User.findOne({ username });

        if (!user || !verifyPassword(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Update online status
        user.isOnline = true;
        await user.save();

        // Return user data without password
        res.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                avatar: user.avatar,
                banner: user.banner,
                following: user.following || [],
                followers: user.followers || [],
                likedAlbums: user.likedAlbums || []
            }
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Register
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        const newUser = new User({
            username,
            password: hashPassword(password),
            role: 'user',
            avatar: '',
            banner: '',
            followers: [],
            following: [],
            isOnline: true
        });

        await newUser.save();

        res.json({
            success: true,
            message: 'Registration successful',
            user: {
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error('❌ Register error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// === USERS ROUTES ===

// Get all users
app.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user by username
app.get('/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('❌ Error fetching user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user
app.put('/users/:username', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { username: req.params.username },
            req.body,
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        console.error('❌ Error updating user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === SONGS ROUTES ===

// Get all songs
app.get('/songs', async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (err) {
        console.error('❌ Error fetching songs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get song by ID
app.get('/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(song);
    } catch (err) {
        console.error('❌ Error fetching song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create song (upload audio to Cloudinary)
app.post('/songs', upload.single('audio'), async (req, res) => {
    try {
        const { title, artist, genre, album, cover, src } = req.body;

        let audioUrl = src; // Could be SoundCloud link

        // If audio file is provided, upload to Cloudinary
        if (req.file) {
            console.log('📤 Uploading audio to Cloudinary...');
            const result = await cloudinary.uploader.upload_stream(
                {
                    resource_type: 'video', // Cloudinary treats audio as video
                    folder: 'spider-music/songs',
                    public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    format: 'mp3'
                },
                async (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary upload error:', error);
                        return res.status(500).json({ error: 'Failed to upload audio' });
                    }

                    // Save song to MongoDB with Cloudinary URL
                    const song = new Song({
                        title,
                        artist,
                        genre: genre || '',
                        album: album || '',
                        cover: cover || '',
                        src: result.secure_url, // Cloudinary URL
                        likes: [],
                        createdAt: new Date()
                    });

                    await song.save();
                    console.log(`✅ Song saved: ${title}`);
                    res.json({ success: true, song });
                }
            );

            // Convert buffer to stream
            result.end(req.file.buffer);
        } else if (src) {
            // If no file but src provided (e.g., SoundCloud link)
            const song = new Song({
                title,
                artist,
                genre: genre || '',
                album: album || '',
                cover: cover || '',
                src, // Use provided URL
                likes: [],
                createdAt: new Date()
            });

            await song.save();
            console.log(`✅ Song saved: ${title}`);
            res.json({ success: true, song });
        } else {
            res.status(400).json({ error: 'Audio file or src URL required' });
        }
    } catch (err) {
        console.error('❌ Error creating song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update song
app.put('/songs/:id', async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(song);
    } catch (err) {
        console.error('❌ Error updating song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete song
app.delete('/songs/:id', async (req, res) => {
    try {
        const song = await Song.findByIdAndDelete(req.params.id);
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json({ success: true, message: 'Song deleted' });
    } catch (err) {
        console.error('❌ Error deleting song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Like/Unlike song
app.post('/songs/:id/like', async (req, res) => {
    try {
        const { username } = req.body;
        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        const likeIndex = song.likes.indexOf(username);
        if (likeIndex > -1) {
            song.likes.splice(likeIndex, 1); // Unlike
        } else {
            song.likes.push(username); // Like
        }

        await song.save();
        res.json({ success: true, likes: song.likes.length });
    } catch (err) {
        console.error('❌ Error liking song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === PLAYLISTS ROUTES ===

// Get all playlists
app.get('/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.find().populate('songs');
        res.json(playlists);
    } catch (err) {
        console.error('❌ Error fetching playlists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create playlist
app.post('/playlists', async (req, res) => {
    try {
        const { name, owner, description, isPublic } = req.body;

        const playlist = new Playlist({
            name,
            owner,
            description: description || '',
            isPublic: isPublic || false,
            songs: []
        });

        await playlist.save();
        res.json({ success: true, playlist });
    } catch (err) {
        console.error('❌ Error creating playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add song to playlist
app.post('/playlists/:id/songs', async (req, res) => {
    try {
        const { songId } = req.body;
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            await playlist.save();
        }

        res.json({ success: true, playlist });
    } catch (err) {
        console.error('❌ Error adding song to playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === ARTISTS ROUTES ===

// Get all artists
app.get('/artists', async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (err) {
        console.error('❌ Error fetching artists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create artist
app.post('/artists', async (req, res) => {
    try {
        const { name, bio } = req.body;

        const artist = new Artist({
            name,
            bio: bio || '',
            followers: 0
        });

        await artist.save();
        res.json({ success: true, artist });
    } catch (err) {
        console.error('❌ Error creating artist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === GENRES ROUTES ===

// Get all genres
app.get('/genres', async (req, res) => {
    try {
        const genres = await Genre.find();
        res.json(genres.map(g => g.name));
    } catch (err) {
        console.error('❌ Error fetching genres:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create genre
app.post('/genres', async (req, res) => {
    try {
        const { name } = req.body;

        const genre = new Genre({ name });
        await genre.save();
        res.json({ success: true, genre });
    } catch (err) {
        console.error('❌ Error creating genre:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === POSTS ROUTES ===

// Get all posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('❌ Error fetching posts:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create post
app.post('/posts', async (req, res) => {
    try {
        const { author, content } = req.body;

        const post = new Post({
            author,
            content,
            likes: [],
            image: ''
        });

        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('❌ Error creating post:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === NOTIFICATIONS ROUTES ===

// Get user notifications
app.get('/notifications/:username', async (req, res) => {
    try {
        const notifications = await Notification.find({ targetUser: req.params.username }).sort({ timestamp: -1 });
        res.json(notifications);
    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create notification
app.post('/notifications', async (req, res) => {
    try {
        const { targetUser, message, sender } = req.body;

        const notification = new Notification({
            targetUser,
            message,
            sender: sender || 'System',
            read: false
        });

        await notification.save();
        res.json({ success: true, notification });
    } catch (err) {
        console.error('❌ Error creating notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === INITIALIZATION ROUTES ===

// Initialize default data
app.post('/init-defaults', async (req, res) => {
    try {
        // Create default genres
        const genreNames = ['Rap', 'Pop', 'Rock', 'Electro', 'R&B', 'Jazz', 'Classical'];
        for (const name of genreNames) {
            await Genre.findOneAndUpdate({ name }, { name }, { upsert: true });
        }

        // Create admin user if doesn't exist
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: hashPassword('admin123'),
                role: 'superadmin',
                avatar: '',
                banner: '',
                followers: [],
                following: []
            });
        }

        res.json({ success: true, message: 'Defaults initialized' });
    } catch (err) {
        console.error('❌ Error initializing defaults:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// === ERROR HANDLING ===

// Root route - serve index.html or simple test
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(content);
        } else {
            res.send('<h1>Spider Music</h1><p>App is running but index.html not found</p>');
        }
    } catch (err) {
        console.error('❌ Error serving root:', err);
        res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
});

// 404 handler - must be after all routes
app.use((req, res) => {
    try {
        // API routes return JSON
        if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/songs') || req.path.startsWith('/users') || req.path.startsWith('/playlists') || req.path.startsWith('/artists') || req.path.startsWith('/genres') || req.path.startsWith('/posts') || req.path.startsWith('/notifications')) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }
        
        // Try to serve index.html for other routes
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(content);
        } else {
            res.status(404).send('<h1>404 - Not Found</h1>');
        }
    } catch (err) {
        console.error('❌ 404 handler error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Error handler - must be last
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});

// === SERVER STARTUP ===

async function startServer() {
    try {
        // Wait for MongoDB connection
        await new Promise((resolve, reject) => {
            const checkConnection = setInterval(() => {
                if (mongoose.connection.readyState === 1) {
                    clearInterval(checkConnection);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkConnection);
                reject(new Error('MongoDB connection timeout'));
            }, 10000);
        });

        // Check and migrate data if needed
        const existingUsers = await User.countDocuments();
        if (existingUsers === 0) {
            console.log('🔄 No users in MongoDB. Loading data from JSON files...');
            try {
                // Load JSON data
                const loadJSON = (filePath) => {
                    if (!fs.existsSync(filePath)) return [];
                    try {
                        return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
                    } catch (e) {
                        console.warn(`⚠️  Error reading ${filePath}:`, e.message);
                        return [];
                    }
                };

                const dataDir = __dirname;
                const users = loadJSON(path.join(dataDir, 'users.json'));
                const artists = loadJSON(path.join(dataDir, 'artists.json'));
                const songs = loadJSON(path.join(dataDir, 'songs.json'));
                const playlists = loadJSON(path.join(dataDir, 'playlists.json'));
                const genres = loadJSON(path.join(dataDir, 'genres.json'));
                const posts = loadJSON(path.join(dataDir, 'posts.json'));
                const notifications = loadJSON(path.join(dataDir, 'notifications.json'));

                console.log(`📥 Migrating ${users.length} users, ${songs.length} songs, ${playlists.length} playlists...`);

                // Migrate users with hashed passwords
                for (const user of users) {
                    await User.findOneAndUpdate(
                        { username: user.username },
                        { ...user, password: hashPassword(user.password) },
                        { upsert: true }
                    );
                }

                // Migrate artists
                for (const artist of artists) {
                    await Artist.findOneAndUpdate({ name: artist.name }, artist, { upsert: true });
                }

                // Migrate songs
                for (const song of songs) {
                    await Song.findOneAndUpdate(
                        { title: song.title, artist: song.artist },
                        song,
                        { upsert: true }
                    );
                }

                // Migrate playlists
                for (const playlist of playlists) {
                    await Playlist.findOneAndUpdate(
                        { name: playlist.name, owner: playlist.owner },
                        playlist,
                        { upsert: true }
                    );
                }

                // Migrate genres
                for (const genre of genres) {
                    await Genre.findOneAndUpdate(
                        { name: genre.name || genre },
                        { name: genre.name || genre },
                        { upsert: true }
                    );
                }

                // Migrate posts
                for (const post of posts) {
                    await Post.findOneAndUpdate(
                        { author: post.author, content: post.content },
                        post,
                        { upsert: true }
                    );
                }

                // Migrate notifications
                for (const notif of notifications) {
                    await Notification.findOneAndUpdate(
                        { targetUser: notif.targetUser, message: notif.message },
                        notif,
                        { upsert: true }
                    );
                }

                console.log('✅ Data migration complete!');
            } catch (err) {
                console.warn('⚠️  Migration error (continuing):', err.message);
            }
        } else {
            console.log(`ℹ️  MongoDB already contains ${existingUsers} users. Skipping migration.`);
        }

        // Start server
        const HOST = '0.0.0.0';
        const server = app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on http://${HOST}:${PORT}`);
            console.log(`📡 MongoDB: Connected to spider-music database`);
            console.log(`☁️  Cloudinary: Configured for uploads`);
        });

        // Keep server alive
        server.keepAliveTimeout = 65000;

        // Global error handlers
        process.on('uncaughtException', (err) => {
            console.error('❌ Uncaught Exception:', err);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection:', reason);
        });

        process.on('SIGTERM', () => {
            console.log('📴 SIGTERM received, shutting down gracefully...');
            server.close(() => {
                console.log('🛑 Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('⛔ SIGINT received, shutting down gracefully...');
            server.close(() => {
                console.log('🛑 Server closed');
                process.exit(0);
            });
        });

        server.on('error', (err) => {
            console.error('❌ Server error:', err);
        });

        console.log('✅ All systems ready. Server is listening...');
    } catch (err) {
        console.error('❌ Server startup error:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

startServer();
