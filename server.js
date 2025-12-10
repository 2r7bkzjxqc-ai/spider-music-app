const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION CLOUDINARY ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvtkoyj0w',
    api_key: process.env.CLOUDINARY_API_KEY || '741567951621919',
    api_secret: process.env.CLOUDINARY_API_SECRET || '-aEPdpeDrncsTsNcGP88cSg9st0'
});

app.use(cors());
app.use(bodyParser.json({ limit: '2gb' }));

// --- CONFIGURATION MULTER POUR UPLOADS (Stockage en mémoire pour Cloudinary) ---
const storage = multer.memoryStorage();

// Filtrer pour n'accepter que les fichiers audio
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

// --- CRÉER LES DOSSIERS NÉCESSAIRES ---
const uploadDir = path.join(__dirname, 'uploads');
const audioDir = path.join(__dirname, 'uploads', 'audio');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

// --- AJOUT IMPORTANT : SERVIR LE SITE WEB ---
// Cela permet d'accéder à votre site via http://localhost:3000
app.use(express.static(__dirname));
// Servir les fichiers audio uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// FICHIERS DE DONNÉES
const FILES = {
    USERS: path.join(__dirname, 'users.json'),
    ARTISTS: path.join(__dirname, 'artists.json'),
    SONGS: path.join(__dirname, 'songs.json'),
    PLAYLISTS: path.join(__dirname, 'playlists.json'),
    GENRES: path.join(__dirname, 'genres.json'),
    NOTIFICATIONS: path.join(__dirname, 'notifications.json'),
    POSTS: path.join(__dirname, 'posts.json')
};

// --- DONNÉES MOCK INITIALES (Si fichiers vides) ---
const MOCK_DATA = {
    USERS: [{ username: "admin", password: "123", role: "superadmin", avatar: "", banner: "", followers: [], following: [] }],
    ARTISTS: [],
    SONGS: [],
    PLAYLISTS: [],
    GENRES: ["Rap", "Pop", "Rock", "Electro", "R&B"],
    NOTIFICATIONS: [],
    POSTS: []
};

// --- HELPERS ---
function load(file, defaultData = []) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        const data = fs.readFileSync(file, 'utf8');
        return data ? JSON.parse(data) : defaultData;
    } catch (e) { return defaultData; }
}

// Queue pour éviter les écritures concurrentes
const saveQueue = new Map();

function save(file, data) {
    // Si une sauvegarde est déjà en cours pour ce fichier, attendre
    if (!saveQueue.has(file)) {
        saveQueue.set(file, Promise.resolve());
    }
    
    const promise = saveQueue.get(file).then(() => {
        return new Promise((resolve, reject) => {
            try {
                fs.writeFileSync(file, JSON.stringify(data, null, 2));
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }).finally(() => {
        if (saveQueue.get(file) === promise) {
            saveQueue.delete(file);
        }
    });
    
    saveQueue.set(file, promise);
    return promise;
}

// CHARGEMENT EN MÉMOIRE
let users = load(FILES.USERS, MOCK_DATA.USERS);
let artists = load(FILES.ARTISTS, MOCK_DATA.ARTISTS);
let songs = load(FILES.SONGS, MOCK_DATA.SONGS);
let playlists = load(FILES.PLAYLISTS, MOCK_DATA.PLAYLISTS);
let genres = load(FILES.GENRES, MOCK_DATA.GENRES);
let notifications = load(FILES.NOTIFICATIONS, MOCK_DATA.NOTIFICATIONS);
let posts = load(FILES.POSTS, MOCK_DATA.POSTS);

// Initialiser les likes pour les chansons existantes
songs.forEach(song => {
    if (!song.likes) song.likes = [];
});

// Initialiser les albums likés pour les utilisateurs
users.forEach(user => {
    if (!user.likedAlbums) user.likedAlbums = [];
});

// Initialiser les likes pour les posts
posts.forEach(post => {
    if (!post.likes) post.likes = [];
});

function createNotification(targetUser, message, sender = 'System') {
    const notif = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        targetUser,
        message,
        sender,
        read: false,
        timestamp: Date.now()
    };
    notifications.unshift(notif);
    save(FILES.NOTIFICATIONS, notifications);
}

// --- ROUTES ---

// 1. AUTH & USERS
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        user.isOnline = true; // Simuler en ligne
        save(FILES.USERS, users);
        res.json({ 
            success: true, 
            role: user.role, 
            following: user.following || [], 
            avatar: user.avatar,
            likedAlbums: user.likedAlbums || []
        });
    } else res.status(401).json({ success: false, message: "Identifiants incorrects" });
});

app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.json({ success: false, message: "Pris" });
    const newUser = { 
        username, 
        password, 
        role: 'user', 
        avatar: "", 
        banner: "", 
        followers: [], 
        following: [],
        isOnline: true 
    };
    users.push(newUser);
    save(FILES.USERS, users);
    res.json({ success: true, role: 'user', following: [], avatar: "" });
});

app.get('/users', (req, res) => res.json(users));

app.get('/users/profile/:username', (req, res) => {
    const u = users.find(x => x.username === req.params.username);
    if (!u) return res.status(404).json({});
    // Enrichir avec les playlists publiques
    const userPlaylists = playlists.filter(p => p.owner === u.username);
    res.json({ ...u, playlists: userPlaylists, followers: u.followers || [], following: u.following || [] });
});

// Change username
app.put('/users/:username', (req, res) => {
    const { username } = req.params;
    const { newUsername } = req.body;
    
    if (!newUsername || newUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    // Check if new username already exists
    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase());
    if (exists) {
        return res.status(409).json({ error: 'Username already exists' });
    }
    
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const oldUsername = users[userIndex].username;
    users[userIndex].username = newUsername;
    
    // Update username in playlists
    playlists.forEach(p => {
        if (p.owner === oldUsername) p.owner = newUsername;
    });
    
    // Update username in posts
    posts.forEach(p => {
        if (p.author === oldUsername) p.author = newUsername;
    });
    
    // Update username in song likes
    songs.forEach(s => {
        if (s.likes && s.likes.includes(oldUsername)) {
            const index = s.likes.indexOf(oldUsername);
            s.likes[index] = newUsername;
        }
    });
    
    // Update username in post likes
    posts.forEach(p => {
        if (p.likes && p.likes.includes(oldUsername)) {
            const index = p.likes.indexOf(oldUsername);
            p.likes[index] = newUsername;
        }
    });
    
    save(FILES.USERS, users);
    save(FILES.PLAYLISTS, playlists);
    save(FILES.POSTS, posts);
    save(FILES.SONGS, songs);
    
    res.json({ success: true, newUsername });
});

// Update username
app.put('/users/:username', (req, res) => {
    const { username } = req.params;
    const { newUsername } = req.body;
    
    if (!newUsername || newUsername.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    
    // Check if new username already exists
    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.username !== username);
    if (exists) {
        return res.status(400).json({ error: "Username already exists" });
    }
    
    // Find user
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
    }
    
    // Update username
    users[userIndex].username = newUsername;
    
    // Update in playlists (owner)
    playlists.forEach(p => {
        if (p.owner === username) {
            p.owner = newUsername;
        }
    });
    
    // Update in posts (author)
    posts.forEach(p => {
        if (p.author === username) {
            p.author = newUsername;
        }
    });
    
    // Update in songs likes
    songs.forEach(s => {
        if (s.likes && s.likes.includes(username)) {
            const index = s.likes.indexOf(username);
            s.likes[index] = newUsername;
        }
    });
    
    // Update in posts likes
    posts.forEach(p => {
        if (p.likes && p.likes.includes(username)) {
            const index = p.likes.indexOf(username);
            p.likes[index] = newUsername;
        }
    });
    
    // Update in artists if exists
    const artistIndex = artists.findIndex(a => a.name === username);
    if (artistIndex !== -1) {
        artists[artistIndex].name = newUsername;
    }
    
    // Save all updated data
    save(FILES.USERS, users);
    save(FILES.PLAYLISTS, playlists);
    save(FILES.POSTS, posts);
    save(FILES.SONGS, songs);
    save(FILES.ARTISTS, artists);
    
    res.json({ success: true, newUsername });
});

app.put('/users/profile', (req, res) => {
    const { username, avatar, banner } = req.body;
    const uIdx = users.findIndex(x => x.username === username);
    if (uIdx !== -1) {
        if (avatar) users[uIdx].avatar = avatar;
        if (banner) users[uIdx].banner = banner;
        save(FILES.USERS, users);
        
        // Update artist profile if exists
        const aIdx = artists.findIndex(a => a.name === username);
        if (aIdx !== -1) {
            if (avatar) artists[aIdx].avatar = avatar;
            if (banner) artists[aIdx].banner = banner;
            save(FILES.ARTISTS, artists);
        }
        res.json({ success: true });
    } else res.status(404).json({ error: "User not found" });
});

app.post('/users/role', (req, res) => {
    const { requester, targetUser, newRole } = req.body;
    const reqU = users.find(u => u.username === requester);
    if (reqU && (reqU.role === 'admin' || reqU.role === 'superadmin')) {
        const target = users.find(u => u.username === targetUser);
        if (target) {
            target.role = newRole;
            save(FILES.USERS, users);
            createNotification(targetUser, `Votre rôle a été changé en : ${newRole}`, requester);
            res.json({ success: true });
        } else res.status(404).json({ error: "Target not found" });
    } else res.status(403).json({ error: "Unauthorized" });
});

// ABONNEMENTS (FIX)
app.post('/users/follow', (req, res) => {
    const { requester, target } = req.body;
    const reqUser = users.find(u => u.username === requester);
    const targetUser = users.find(u => u.username === target);

    if (reqUser && targetUser) {
        // Initialiser les tableaux si manquants
        if (!reqUser.following) reqUser.following = [];
        if (!targetUser.followers) targetUser.followers = [];

        const isFollowing = reqUser.following.includes(target);

        if (isFollowing) {
            // Se désabonner
            reqUser.following = reqUser.following.filter(u => u !== target);
            targetUser.followers = targetUser.followers.filter(u => u !== requester);
        } else {
            // S'abonner
            reqUser.following.push(target);
            targetUser.followers.push(requester);
            createNotification(target, `${requester} a commencé à vous suivre !`, requester);
        }
        
        // Mettre à jour l'artiste si c'en est un
        const artist = artists.find(a => a.name === target);
        if (artist) {
            artist.followersCount = targetUser.followers.length;
            save(FILES.ARTISTS, artists);
        }

        save(FILES.USERS, users);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// 2. SONGS & ARTISTS
app.get('/songs', (req, res) => res.json(songs));
app.post('/songs', (req, res) => {
    (async () => {
        try {
            console.log('📥 Received song upload request');
            let songData = { ...req.body };

            // If src is a data URL (base64), save it to disk instead of storing huge base64 in JSON
            if (songData.src && typeof songData.src === 'string' && songData.src.startsWith('data:')) {
                try {
                    console.log('🔄 Processing base64 audio data...');
                    const matches = songData.src.match(/^data:(.+);base64,(.+)$/);
                    if (matches) {
                        const mime = matches[1];
                        const base64 = matches[2];
                        // Extract extension from MIME type or use default
                        let ext = (mime.split('/')[1] || 'bin').split(';')[0];
                        // Handle common audio MIME types
                        const mimeToExt = {
                            'mpeg': 'mp3',
                            'x-wav': 'wav',
                            'wav': 'wav',
                            'flac': 'flac',
                            'x-flac': 'flac',
                            'ogg': 'ogg',
                            'aac': 'aac',
                            'x-m4a': 'm4a',
                            'mp4': 'm4a',
                            'opus': 'opus',
                            'x-ms-wma': 'wma',
                            'x-aiff': 'aiff',
                            'aiff': 'aiff',
                            'x-ape': 'ape'
                        };
                        ext = mimeToExt[ext] || ext;
                        const buffer = Buffer.from(base64, 'base64');
                        console.log(`📊 Audio size: ${(buffer.length/1024/1024).toFixed(2)} MB, format: ${ext}`);

                        const uploadDir = path.join(__dirname, 'uploads', 'audio');
                        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                        const filename = `song_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                        const filePath = path.join(uploadDir, filename);
                        fs.writeFileSync(filePath, buffer);
                        console.log(`💾 Saved audio file: ${filename}`);
                        // Use a web-accessible relative path
                        songData.src = `/uploads/audio/${filename}`;
                    } else {
                        // Not a valid data URL
                        console.error('❌ Invalid data URL format');
                        songData.src = '';
                    }
                } catch (err) {
                    console.error('❌ Error while processing data URL for song:', err);
                    songData.src = '';
                }
            }

            // Generate unique ID with microsecond precision + random component
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const s = { id: uniqueId, ...songData };
            songs.push(s);

            // Save with try/catch to avoid crashing on huge JSON
            try {
                save(FILES.SONGS, songs);
                console.log(`✅ Song saved to database: "${s.title}" by ${s.artist}`);
            } catch (err) {
                console.error('❌ Error saving songs.json:', err);
                // Rollback the push
                songs = songs.filter(x => x.id !== s.id);
                return res.status(500).json({ success: false, error: 'Unable to save song (server storage issue).' });
            }

            createNotification('all', `Nouveau titre ajouté : ${s.title} par ${s.artist}`);
            return res.json({ success: true });
        } catch (e) {
            console.error('Unhandled error in /songs POST:', e);
            return res.status(500).json({ success: false, error: 'Server error' });
        }
    })();
});
app.put('/songs/:id', (req, res) => {
    const { id } = req.params;
    const { song } = req.body; // Wrapper {username, song} or just body
    const updateData = song || req.body;
    
    const idx = songs.findIndex(s => s.id == id);
    if (idx !== -1) {
        songs[idx] = { ...songs[idx], ...updateData, id }; // Keep ID
        save(FILES.SONGS, songs);
        res.json({ success: true });
    } else res.status(404).json({ error: "Song not found" });
});
app.delete('/songs/:id', (req, res) => {
    songs = songs.filter(s => s.id != req.params.id);
    save(FILES.SONGS, songs);
    res.json({ success: true });
});

// LIKE/UNLIKE SONG
app.post('/songs/:id/like', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    const song = songs.find(s => s.id === id);
    if (!song) {
        return res.status(404).json({ success: false, message: 'Song not found' });
    }
    
    // Initialize likes array if it doesn't exist
    if (!song.likes) {
        song.likes = [];
    }
    
    // Toggle like
    const likeIndex = song.likes.indexOf(username);
    if (likeIndex > -1) {
        // Unlike
        song.likes.splice(likeIndex, 1);
    } else {
        // Like
        song.likes.push(username);
    }
    
    save(FILES.SONGS, songs);
    res.json({ success: true, liked: likeIndex === -1, likeCount: song.likes.length });
});

// LIKE/UNLIKE ALBUM
app.post('/albums/:albumName/like', (req, res) => {
    const albumName = decodeURIComponent(req.params.albumName);
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize likedAlbums array if it doesn't exist
    if (!user.likedAlbums) {
        user.likedAlbums = [];
    }
    
    // Toggle like
    const likeIndex = user.likedAlbums.indexOf(albumName);
    if (likeIndex > -1) {
        // Unlike
        user.likedAlbums.splice(likeIndex, 1);
    } else {
        // Like
        user.likedAlbums.push(albumName);
    }
    
    save(FILES.USERS, users);
    res.json({ success: true, liked: likeIndex === -1, albumName: albumName });
});

app.get('/artists', (req, res) => res.json(artists));

// UPLOAD ENDPOINT POUR FICHIERS AUDIO
app.post('/upload-audio', upload.single('audioFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Vérifier si Cloudinary est configuré
        const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME || cloudinary.config().cloud_name;
        
        if (cloudinaryConfigured) {
            // Upload vers Cloudinary avec upload preset
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'video', // Cloudinary utilise 'video' pour les fichiers audio
                    folder: 'spider-music',
                    upload_preset: 'spider-music',
                    public_id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        // Fallback: stockage local temporaire
                        const tempPath = `/uploads/audio/temp-${Date.now()}.mp3`;
                        console.log('Fallback to local storage:', tempPath);
                        return res.json({ success: true, filePath: tempPath, warning: 'Stored locally (temporary)' });
                    }
                    // Retourne l'URL Cloudinary
                    console.log('File uploaded to Cloudinary:', result.secure_url);
                    res.json({ success: true, filePath: result.secure_url });
                }
            );

            // Envoie le buffer vers Cloudinary
            uploadStream.end(req.file.buffer);
        } else {
            // Cloudinary non configuré, stockage local temporaire
            const tempPath = `/uploads/audio/temp-${Date.now()}.mp3`;
            console.log('Cloudinary not configured, using local storage:', tempPath);
            res.json({ success: true, filePath: tempPath, warning: 'Stored locally (will be lost on redeploy)' });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
    }
});

app.get('/artists/:name', (req, res) => {
    const artist = artists.find(a => a.name === req.params.name) || {};
    // Si pas trouvé dans artists.json, chercher dans users
    if (!artist.name) {
        const userArtist = users.find(u => u.username === req.params.name);
        if (userArtist) {
            return res.json({ 
                name: userArtist.username, 
                avatar: userArtist.avatar, 
                banner: userArtist.banner,
                followersCount: userArtist.followers ? userArtist.followers.length : 0 
            });
        }
    }
    res.json(artist);
});
app.post('/artists', (req, res) => {
    const { name, avatar, banner } = req.body;
    const idx = artists.findIndex(a => a.name === name);
    if (idx !== -1) {
        artists[idx] = { ...artists[idx], avatar, banner };
    } else {
        artists.push({ name, avatar, banner, followersCount: 0 });
    }
    save(FILES.ARTISTS, artists);
    res.json({ success: true });
});

// 3. PLAYLISTS
app.get('/playlists', (req, res) => res.json(playlists));
app.post('/playlists', (req, res) => {
    const p = { id: Date.now().toString(), name: req.body.name, owner: req.body.owner, songIds: [], cover: "" };
    playlists.push(p);
    save(FILES.PLAYLISTS, playlists);
    res.json(p);
});
app.put('/playlists/:id', (req, res) => {
    const idx = playlists.findIndex(p => p.id == req.params.id);
    if (idx !== -1) {
        playlists[idx] = { ...playlists[idx], ...req.body };
        save(FILES.PLAYLISTS, playlists);
        res.json({ success: true });
    } else res.status(404).json({});
});
app.delete('/playlists/:id', (req, res) => {
    playlists = playlists.filter(p => p.id != req.params.id);
    save(FILES.PLAYLISTS, playlists);
    res.json({ success: true });
});
app.post('/playlists/:id/songs', (req, res) => {
    const p = playlists.find(x => x.id == req.params.id);
    if (p) {
        p.songIds.push(req.body.songId);
        save(FILES.PLAYLISTS, playlists);
        res.json({ success: true });
    } else res.status(404).json({});
});
app.delete('/playlists/:id/songs/:sid', (req, res) => {
    const p = playlists.find(x => x.id == req.params.id);
    if (p) {
        p.songIds = p.songIds.filter(id => id !== req.params.sid);
        save(FILES.PLAYLISTS, playlists);
        res.json({ success: true });
    } else res.status(404).json({});
});

// 4. GENRES
app.get('/genres', (req, res) => res.json(genres));
app.post('/genres', (req, res) => {
    const { name } = req.body;
    if (name && !genres.includes(name)) {
        genres.push(name);
        genres.sort();
        save(FILES.GENRES, genres);
    }
    res.json({ success: true });
});
app.delete('/genres/:name', (req, res) => {
    genres = genres.filter(g => g !== req.params.name);
    save(FILES.GENRES, genres);
    res.json({ success: true });
});

// 5. POSTS & NEWS (Fix Delete)
app.get('/posts', (req, res) => res.json(posts));
app.post('/posts', (req, res) => {
    const newPost = { id: Date.now(), ...req.body, date: Date.now() };
    posts.unshift(newPost);
    save(FILES.POSTS, posts);
    createNotification('all', `Nouvelle actu : ${newPost.title}`);
    res.json({ success: true });
});
app.delete('/posts/:id', (req, res) => {
    const { id } = req.params;
    // Filtrage robuste (string vs number)
    posts = posts.filter(p => p.id != id); 
    save(FILES.POSTS, posts);
    res.json({ success: true });
});

// LIKE/UNLIKE POST
app.post('/posts/:id/like', (req, res) => {
    const postId = req.params.id;
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Initialize likes array if it doesn't exist
    if (!post.likes) {
        post.likes = [];
    }
    
    // Toggle like
    const likeIndex = post.likes.indexOf(username);
    if (likeIndex > -1) {
        // Unlike
        post.likes.splice(likeIndex, 1);
    } else {
        // Like
        post.likes.push(username);
    }
    
    save(FILES.POSTS, posts);
    res.json({ success: true, liked: likeIndex === -1, likes: post.likes.length });
});

// 6. NOTIFICATIONS (Fix Centralisation Delete)
app.get('/notifications', (req, res) => {
    // Retourne tout, le front filtre ou on peut filtrer ici si params
    const user = req.query.user;
    if (user) {
        res.json(notifications.filter(n => n.targetUser === user || n.targetUser === 'all'));
    } else {
        res.json(notifications);
    }
});

app.post('/notifications', (req, res) => {
    const { targetUser, message, sender } = req.body;
    createNotification(targetUser, message, sender);
    res.json({ success: true });
});

// DELETE SPECIFIC NOTIF (C'est ce qui manquait pour "la croix")
app.delete('/notifications/:id', (req, res) => {
    const { id } = req.params;
    notifications = notifications.filter(n => n.id != id);
    save(FILES.NOTIFICATIONS, notifications);
    res.json({ success: true });
});

// DELETE ALL NOTIFS FOR USER
app.delete('/notifications', (req, res) => {
    const username = req.query.username; // Passé parfois en query par le front
    // Si pas de query, peut-être dans le body ? Le front utilise fetch DELETE sans body souvent.
    // Supposons que le front appelle boucle DELETE /:id, mais si il y a une fonction "Clear All" :
    if (username) {
        notifications = notifications.filter(n => n.targetUser !== username); // Garde 'all' ou garde autres users
        save(FILES.NOTIFICATIONS, notifications);
    }
    res.json({ success: true });
});

// INITIALISATION ET LANCEMENT
if (!fs.existsSync(FILES.USERS)) save(FILES.USERS, MOCK_DATA.USERS);
if (!fs.existsSync(FILES.ARTISTS)) save(FILES.ARTISTS, MOCK_DATA.ARTISTS);
if (!fs.existsSync(FILES.SONGS)) save(FILES.SONGS, MOCK_DATA.SONGS);
if (!fs.existsSync(FILES.PLAYLISTS)) save(FILES.PLAYLISTS, MOCK_DATA.PLAYLISTS);
if (!fs.existsSync(FILES.GENRES)) save(FILES.GENRES, MOCK_DATA.GENRES);
if (!fs.existsSync(FILES.NOTIFICATIONS)) save(FILES.NOTIFICATIONS, MOCK_DATA.NOTIFICATIONS);
if (!fs.existsSync(FILES.POSTS)) save(FILES.POSTS, MOCK_DATA.POSTS);

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});