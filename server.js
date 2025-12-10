const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

// Import models and auth helpers
const { User, Song, Playlist, Artist, Post, Notification, Genre } = require('./models');
const { hashPassword, verifyPassword, cleanUserData } = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION CLOUDINARY ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvtkoyj0w',
    api_key: process.env.CLOUDINARY_API_KEY || '741567951621919',
    api_secret: process.env.CLOUDINARY_API_SECRET || '-aEPdpeDrncsTsNcGP88cSg9st0'
});

// --- CONFIGURATION MONGOOSE ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    console.error('❌ Please add MONGODB_URI to Railway variables');
    process.exit(1);
}

console.log('📡 Connecting to MongoDB Atlas...');
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    connectTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('❌ Ensure MONGODB_URI is correct in Railway variables');
    process.exit(1);
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '2gb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MULTER CONFIGURATION ---
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
        'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/aac', 
        'audio/x-m4a', 'audio/mp4', 'audio/opus', 'audio/x-ms-wma',
        'audio/x-aiff', 'audio/aiff', 'audio/x-ape', 'audio/webm'
    ];
    const allowedExts = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.opus', '.alac', '.wma', '.aiff', '.ape', '.dsd', '.webm'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier audio non supporté'), false);
    }
};

const upload = multer({ storage, fileFilter });

// --- ROUTES ---

// 1. AUTH & USERS
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (user && verifyPassword(password, user.password)) {
            user.isOnline = true;
            await user.save();
            res.json({ 
                success: true, 
                role: user.role, 
                following: user.following || [], 
                avatar: user.avatar,
                likedAlbums: user.likedAlbums || []
            });
        } else {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ success: false, message: "Username already taken" });
        }
        
        const newUser = new User({
            username,
            password: hashPassword(password), // Hash le mot de passe
            role: 'user',
            avatar: '',
            banner: '',
            followers: [],
            following: [],
            isOnline: true
        });
        
        await newUser.save();
        res.json({ success: true, role: 'user', following: [], avatar: "" });
    } catch (err) {
        console.error('❌ Register error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        // Ne jamais envoyer les mots de passe
        const cleanedUsers = users.map(user => cleanUserData(user));
        res.json(cleanedUsers);
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/users/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({});
        }
        
        const userPlaylists = await Playlist.find({ owner: user.username });
        const cleanedUser = cleanUserData(user);
        res.json({ 
            ...cleanedUser, 
            playlists: userPlaylists, 
            followers: user.followers || [], 
            following: user.following || [] 
        });
    } catch (err) {
        console.error('❌ Error fetching profile:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { newUsername } = req.body;
        
        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        
        const exists = await User.findOne({ username: newUsername });
        if (exists) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const oldUsername = user.username;
        user.username = newUsername;
        await user.save();
        
        await Playlist.updateMany({ owner: oldUsername }, { owner: newUsername });
        await Post.updateMany({ author: oldUsername }, { author: newUsername });
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating username:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/users/profile', async (req, res) => {
    try {
        const { username, avatar, banner } = req.body;
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        if (avatar) user.avatar = avatar;
        if (banner) user.banner = banner;
        await user.save();
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating profile:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/users/follow', async (req, res) => {
    try {
        const { requester, target } = req.body;
        const reqUser = await User.findOne({ username: requester });
        const targetUser = await User.findOne({ username: target });

        if (!reqUser || !targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!reqUser.following) reqUser.following = [];
        if (!targetUser.followers) targetUser.followers = [];

        const isFollowing = reqUser.following.includes(target);

        if (isFollowing) {
            reqUser.following = reqUser.following.filter(u => u !== target);
            targetUser.followers = targetUser.followers.filter(u => u !== requester);
        } else {
            reqUser.following.push(target);
            targetUser.followers.push(requester);
            
            await Notification.create({
                targetUser: target,
                message: `${requester} a commencé à vous suivre !`,
                sender: requester
            });
        }

        await reqUser.save();
        await targetUser.save();
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error following user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. SONGS
app.get('/songs', async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (err) {
        console.error('❌ Error fetching songs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/songs', upload.single('file'), async (req, res) => {
    (async () => {
        try {
            console.log('📥 Received song upload request');
            let songData = { ...req.body };

            if (songData.src && typeof songData.src === 'string' && songData.src.startsWith('data:')) {
                try {
                    console.log('🔄 Processing base64 audio data...');
                    const matches = songData.src.match(/^data:(.+);base64,(.+)$/);
                    if (matches) {
                        const mime = matches[1];
                        const base64 = matches[2];
                        const buffer = Buffer.from(base64, 'base64');
                        console.log(`📊 Audio size: ${(buffer.length/1024/1024).toFixed(2)} MB`);

                        try {
                            const tempDir = path.join(__dirname, 'temp');
                            const tempFilePath = path.join(tempDir, `temp-${Date.now()}.mp3`);
                            
                            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                            fs.writeFileSync(tempFilePath, buffer);
                            
                            const result = await cloudinary.uploader.upload(tempFilePath, {
                                resource_type: 'video',
                                folder: 'spider-music'
                            });
                            
                            fs.unlinkSync(tempFilePath);
                            songData.src = result.secure_url;
                            console.log(`☁️ File uploaded to Cloudinary: ${result.secure_url}`);
                        } catch (cloudinaryError) {
                            console.error('❌ Cloudinary upload error:', cloudinaryError.message);
                            return res.status(500).json({ 
                                success: false, 
                                error: 'Failed to upload to Cloudinary' 
                            });
                        }
                    }
                } catch (err) {
                    console.error('❌ Error processing data URL:', err);
                    return res.status(500).json({ success: false, error: 'Error processing audio' });
                }
            }

            const song = new Song({
                title: songData.title,
                artist: songData.artist,
                genre: songData.genre || '',
                album: songData.album || '',
                cover: songData.cover || '',
                src: songData.src,
                likes: []
            });

            await song.save();
            console.log(`✅ Song saved to MongoDB: "${song.title}" by ${song.artist}`);

            await Notification.create({
                targetUser: 'all',
                message: `Nouveau titre ajouté : ${song.title} par ${song.artist}`,
                sender: 'System'
            });

            res.json({ success: true });
        } catch (e) {
            console.error('❌ Unhandled error in /songs POST:', e);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    })();
});

app.put('/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body.song || req.body;
        
        const song = await Song.findByIdAndUpdate(id, updateData, { new: true });
        if (!song) {
            return res.status(404).json({ error: "Song not found" });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Song.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error deleting song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/songs/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ success: false, message: 'Username required' });
        }
        
        const song = await Song.findById(id);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found' });
        }
        
        const likeIndex = song.likes.indexOf(username);
        if (likeIndex > -1) {
            song.likes.splice(likeIndex, 1);
        } else {
            song.likes.push(username);
        }
        
        await song.save();
        res.json({ success: true, liked: likeIndex === -1, likeCount: song.likes.length });
    } catch (err) {
        console.error('❌ Error liking song:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. PLAYLISTS
app.get('/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.find().populate('songs');
        res.json(playlists);
    } catch (err) {
        console.error('❌ Error fetching playlists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/playlists', async (req, res) => {
    try {
        const { name, owner, isPublic } = req.body;
        
        const playlist = new Playlist({
            name,
            owner,
            isPublic: isPublic || false,
            songs: []
        });
        
        await playlist.save();
        res.json({ success: true, id: playlist._id });
    } catch (err) {
        console.error('❌ Error creating playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/playlists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isPublic } = req.body;
        
        const playlist = await Playlist.findByIdAndUpdate(
            id,
            { name, isPublic },
            { new: true }
        );
        
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/playlists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Playlist.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error deleting playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/playlists/:id/songs', async (req, res) => {
    try {
        const { id } = req.params;
        const { songId } = req.body;
        
        const playlist = await Playlist.findById(id);
        if (!playlist) {
            return res.status(404).json({ error: "Playlist not found" });
        }
        
        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            await playlist.save();
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error adding song to playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. ARTISTS
app.get('/artists', async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (err) {
        console.error('❌ Error fetching artists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/artists', async (req, res) => {
    try {
        const { name, avatar, bio } = req.body;
        
        const artist = new Artist({
            name,
            avatar: avatar || '',
            bio: bio || '',
            followers: 0
        });
        
        await artist.save();
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error creating artist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. POSTS
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('❌ Error fetching posts:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/posts', async (req, res) => {
    try {
        const { author, content, image } = req.body;
        
        const post = new Post({
            author,
            content,
            image: image || '',
            likes: []
        });
        
        await post.save();
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error creating post:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        const post = await Post.findByIdAndUpdate(id, { content }, { new: true });
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating post:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Post.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error deleting post:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/posts/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body;
        
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        
        const likeIndex = post.likes.indexOf(username);
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        } else {
            post.likes.push(username);
        }
        
        await post.save();
        res.json({ success: true, liked: likeIndex === -1, likes: post.likes.length });
    } catch (err) {
        console.error('❌ Error liking post:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 6. NOTIFICATIONS
app.get('/notifications', async (req, res) => {
    try {
        const user = req.query.user;
        let query = {};
        
        if (user) {
            query = { $or: [{ targetUser: user }, { targetUser: 'all' }] };
        }
        
        const notifications = await Notification.find(query).sort({ timestamp: -1 });
        res.json(notifications);
    } catch (err) {
        console.error('❌ Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/notifications', async (req, res) => {
    try {
        const { targetUser, message, sender } = req.body;
        
        const notification = new Notification({
            targetUser,
            message,
            sender: sender || 'System'
        });
        
        await notification.save();
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error creating notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error deleting notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/notifications', async (req, res) => {
    try {
        const username = req.query.username;
        if (username) {
            await Notification.deleteMany({ targetUser: username });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error deleting notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 7. GENRES
app.get('/genres', async (req, res) => {
    try {
        const genres = await Genre.find();
        res.json(genres.map(g => g.name));
    } catch (err) {
        console.error('❌ Error fetching genres:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/init-defaults', async (req, res) => {
    try {
        const genreNames = ["Rap", "Pop", "Rock", "Electro", "R&B"];
        for (const name of genreNames) {
            await Genre.findOneAndUpdate(
                { name },
                { name },
                { upsert: true }
            );
        }
        
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: '123',
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

// START SERVER
async function startServer() {
    try {
        // Attendre la connexion MongoDB
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

        // Vérifier et migrer les données si nécessaire
        const existingUsers = await User.countDocuments();
        if (existingUsers === 0) {
            console.log('🔄 No data in MongoDB. Attempting migration from JSON...');
            try {
                require('./migrate.js');
                // Attendre la migration
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.warn('⚠️ Migration error (continuing anyway):', err.message);
            }
        } else {
            console.log(`ℹ️  MongoDB already contains ${existingUsers} users. Skipping migration.`);
        }

        // Démarrer le serveur
        const HOST = '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on http://${HOST}:${PORT}`);
            console.log(`📡 MongoDB: ${MONGODB_URI}`);
        });
    } catch (err) {
        console.error('❌ Server startup error:', err.message);
        process.exit(1);
    }
}

startServer();
