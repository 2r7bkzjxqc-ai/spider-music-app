const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { User, Song, Playlist, Artist, Post, Notification, Genre } = require('./models');
const { hashPassword } = require('./utils/auth');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spider-music';

async function migrateData() {
    try {
        // Connexion à MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Vérifier si les données existent déjà dans MongoDB
        const existingUsers = await User.countDocuments();
        const existingSongs = await Song.countDocuments();
        const existingGenres = await Genre.countDocuments();

        // Si les données existent déjà, ne pas migrer
        if (existingUsers > 0 || existingSongs > 0 || existingGenres > 0) {
            console.log('ℹ️  MongoDB already contains data. Skipping migration.');
            await mongoose.disconnect();
            return;
        }

        console.log('🔄 Starting data migration from JSON to MongoDB...');

        // Chemins des fichiers JSON
        const dataDir = __dirname;
        const FILES = {
            USERS: path.join(dataDir, 'users.json'),
            ARTISTS: path.join(dataDir, 'artists.json'),
            SONGS: path.join(dataDir, 'songs.json'),
            PLAYLISTS: path.join(dataDir, 'playlists.json'),
            GENRES: path.join(dataDir, 'genres.json'),
            NOTIFICATIONS: path.join(dataDir, 'notifications.json'),
            POSTS: path.join(dataDir, 'posts.json')
        };

        // Helper pour charger JSON
        const loadJSON = (filePath) => {
            if (!fs.existsSync(filePath)) return [];
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
            } catch (e) {
                console.warn(`⚠️  Error reading ${filePath}:`, e.message);
                return [];
            }
        };

        // 1. Migrer GENRES
        console.log('📂 Migrating genres...');
        const genres = loadJSON(FILES.GENRES);
        if (genres.length > 0) {
            for (const genreName of genres) {
                await Genre.findOneAndUpdate(
                    { name: genreName },
                    { name: genreName },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${genres.length} genres`);
        }

        // 2. Migrer USERS
        console.log('👥 Migrating users...');
        const users = loadJSON(FILES.USERS);
        if (users.length > 0) {
            for (const userData of users) {
                await User.findOneAndUpdate(
                    { username: userData.username },
                    {
                        username: userData.username,
                        password: hashPassword(userData.password), // Hash les anciens mots de passe
                        role: userData.role || 'user',
                        avatar: userData.avatar || '',
                        banner: userData.banner || '',
                        followers: userData.followers || [],
                        following: userData.following || [],
                        likedAlbums: userData.likedAlbums || [],
                        isOnline: false
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${users.length} users`);
        }

        // 3. Migrer ARTISTS
        console.log('🎤 Migrating artists...');
        const artists = loadJSON(FILES.ARTISTS);
        if (artists.length > 0) {
            for (const artistData of artists) {
                await Artist.findOneAndUpdate(
                    { name: artistData.name },
                    {
                        name: artistData.name,
                        avatar: artistData.avatar || '',
                        bio: artistData.bio || '',
                        followers: artistData.followers || artistData.followersCount || 0
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${artists.length} artists`);
        }

        // 4. Migrer SONGS
        console.log('🎵 Migrating songs...');
        const songs = loadJSON(FILES.SONGS);
        if (songs.length > 0) {
            for (const songData of songs) {
                await Song.findOneAndUpdate(
                    { _id: songData.id || songData._id },
                    {
                        title: songData.title,
                        artist: songData.artist,
                        genre: songData.genre || '',
                        album: songData.album || '',
                        cover: songData.cover || '',
                        src: songData.src,
                        likes: songData.likes || [],
                        createdAt: songData.createdAt || new Date()
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${songs.length} songs`);
        }

        // 5. Migrer PLAYLISTS
        console.log('📋 Migrating playlists...');
        const playlists = loadJSON(FILES.PLAYLISTS);
        if (playlists.length > 0) {
            for (const playlistData of playlists) {
                await Playlist.findOneAndUpdate(
                    { _id: playlistData.id || playlistData._id },
                    {
                        name: playlistData.name,
                        owner: playlistData.owner,
                        isPublic: playlistData.isPublic || false,
                        description: playlistData.description || '',
                        songs: playlistData.songs || playlistData.songIds || [],
                        createdAt: playlistData.createdAt || new Date()
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${playlists.length} playlists`);
        }

        // 6. Migrer POSTS
        console.log('📝 Migrating posts...');
        const posts = loadJSON(FILES.POSTS);
        if (posts.length > 0) {
            for (const postData of posts) {
                await Post.findOneAndUpdate(
                    { _id: postData.id || postData._id },
                    {
                        author: postData.author,
                        content: postData.content || postData.title || '',
                        image: postData.image || '',
                        likes: postData.likes || [],
                        createdAt: postData.createdAt || postData.date || new Date()
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${posts.length} posts`);
        }

        // 7. Migrer NOTIFICATIONS
        console.log('🔔 Migrating notifications...');
        const notifications = loadJSON(FILES.NOTIFICATIONS);
        if (notifications.length > 0) {
            for (const notifData of notifications) {
                await Notification.findOneAndUpdate(
                    { _id: notifData.id || notifData._id },
                    {
                        targetUser: notifData.targetUser,
                        message: notifData.message,
                        sender: notifData.sender || 'System',
                        read: notifData.read || false,
                        timestamp: notifData.timestamp || new Date()
                    },
                    { upsert: true }
                );
            }
            console.log(`✅ Migrated ${notifications.length} notifications`);
        }

        console.log('🎉 Migration completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Users: ${users.length}`);
        console.log(`   - Artists: ${artists.length}`);
        console.log(`   - Songs: ${songs.length}`);
        console.log(`   - Playlists: ${playlists.length}`);
        console.log(`   - Posts: ${posts.length}`);
        console.log(`   - Notifications: ${notifications.length}`);
        console.log(`   - Genres: ${genres.length}`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Exécuter la migration
migrateData();
