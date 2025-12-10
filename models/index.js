const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'artist', 'superadmin'] },
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
    src: { type: String, required: true }, // Cloudinary URL
    likes: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

// Playlist Schema
const playlistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: String, required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    description: { type: String, default: '' },
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Artist Schema
const artistSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    followers: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
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

// Genre Schema
const genreSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    description: { type: String, default: '' }
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Song: mongoose.model('Song', songSchema),
    Playlist: mongoose.model('Playlist', playlistSchema),
    Artist: mongoose.model('Artist', artistSchema),
    Post: mongoose.model('Post', postSchema),
    Notification: mongoose.model('Notification', notificationSchema),
    Genre: mongoose.model('Genre', genreSchema)
};
