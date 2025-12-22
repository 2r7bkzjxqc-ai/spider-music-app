#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// Needed behind Cloudflare Tunnel / reverse proxies so req.protocol uses X-Forwarded-Proto.
app.set('trust proxy', true);

const PORT = parseInt(process.env.PC_APP_PORT || process.env.PORT, 10) || 5050;

const DEFAULT_WINDOWS_STORAGE_ROOT = 'D:\\stockagespidermusic';

const STORAGE_ROOT = process.env.PC_STORAGE_ROOT
  ? path.resolve(process.env.PC_STORAGE_ROOT)
  : (process.platform === 'win32' && fs.existsSync('D:\\')
      ? DEFAULT_WINDOWS_STORAGE_ROOT
      : path.join(__dirname, 'pc_uploads'));

// Data + storage live on your PC
// Default: keep *everything* under STORAGE_ROOT so a single folder can be backed up.
const DATA_DIR = process.env.PC_DATA_DIR
  ? path.resolve(process.env.PC_DATA_DIR)
  : path.join(STORAGE_ROOT, 'data');

const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
const AUDIO_DIR = path.join(STORAGE_ROOT, 'audio');
const MEDIA_DIR = path.join(STORAGE_ROOT, 'media');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });

app.use(cors({ origin: true }));
// UI sends base64 Data URLs for audio/covers/avatars; allow larger payloads.
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true }));

function getPublicBaseUrl(req) {
  const configured = (process.env.PC_PUBLIC_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function requireToken(req, res, next) {
  const expected = (process.env.PC_STORAGE_TOKEN || '').trim();
  if (!expected) return next();
  const provided = (req.get('x-storage-token') || '').trim();
  if (!provided || provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function readJson(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function ensureDataFile(fileName, fallback) {
  const dataPath = path.join(DATA_DIR, fileName);
  if (fs.existsSync(dataPath)) return;

  // One-time migrate from repo root JSON files if present.
  const legacyPath = path.join(__dirname, fileName);
  try {
    if (fs.existsSync(legacyPath)) {
      fs.copyFileSync(legacyPath, dataPath);
      return;
    }
  } catch {
    // ignore
  }
  writeJson(fileName, fallback);
}

function writeJson(fileName, value) {
  const filePath = path.join(DATA_DIR, fileName);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function safeExt(originalName, mimeType) {
  const extFromName = path.extname(originalName || '').slice(0, 12);
  if (extFromName && /^[.a-zA-Z0-9]+$/.test(extFromName)) return extFromName;
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'audio/mpeg') return '.mp3';
  if (mimeType === 'audio/wav') return '.wav';
  if (mimeType === 'audio/ogg') return '.ogg';
  if (mimeType === 'audio/mp4') return '.m4a';
  if (mimeType === 'video/mp4') return '.mp4';
  if (mimeType === 'video/webm') return '.webm';
  return '';
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const meta = dataUrl.slice(5, comma); // after 'data:'
  const base64Part = dataUrl.slice(comma + 1);
  if (!/;base64/i.test(meta)) return null;
  const mimeType = meta.split(';')[0] || 'application/octet-stream';
  return { mimeType, base64: base64Part };
}

function saveDataUrlToFile(dataUrl, destDir, req, prefix) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const { mimeType, base64 } = parsed;
  const ext = safeExt('', mimeType);
  const id = crypto.randomBytes(6).toString('hex');
  const filename = `${Date.now()}_${prefix || 'file'}_${id}${ext}`;
  const filePath = path.join(destDir, filename);

  const buf = Buffer.from(base64, 'base64');
  fs.writeFileSync(filePath, buf);
  const baseUrl = getPublicBaseUrl(req);

  let publicPrefix = 'files/media';
  if (destDir === IMAGES_DIR) publicPrefix = 'files/images';
  if (destDir === AUDIO_DIR) publicPrefix = 'files/audio';
  if (destDir === MEDIA_DIR) publicPrefix = 'files/media';

  return {
    filename,
    mimeType,
    size: buf.length,
    url: `${baseUrl}/${publicPrefix}/${encodeURIComponent(filename)}`
  };
}

function makeUploader(destDir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = safeExt(file.originalname, file.mimetype);
      const id = crypto.randomBytes(6).toString('hex');
      cb(null, `${Date.now()}_${id}${ext}`);
    }
  });

  return multer({
    storage,
    limits: { fileSize: 120 * 1024 * 1024 } // 120MB
  });
}

const uploadImage = makeUploader(IMAGES_DIR);
const uploadAudio = makeUploader(AUDIO_DIR);

// Static file hosting (your PC is the storage)
app.use('/files/images', express.static(IMAGES_DIR, { fallthrough: false }));
app.use('/files/audio', express.static(AUDIO_DIR, { fallthrough: false }));
app.use('/files/media', express.static(MEDIA_DIR, { fallthrough: false }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dataDir: DATA_DIR,
    storageRoot: STORAGE_ROOT,
    tokenRequired: !!(process.env.PC_STORAGE_TOKEN || '').trim(),
    publicBaseUrl: (process.env.PC_PUBLIC_BASE_URL || '').trim() || null
  });
});

// Upload endpoints (store files on PC and return public URLs)
app.post('/upload/image', requireToken, uploadImage.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const baseUrl = getPublicBaseUrl(req);
  const url = `${baseUrl}/files/images/${encodeURIComponent(req.file.filename)}`;
  res.json({ ok: true, url, filename: req.file.filename, size: req.file.size, mimeType: req.file.mimetype });
});

app.post('/upload/audio', requireToken, uploadAudio.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const baseUrl = getPublicBaseUrl(req);
  const url = `${baseUrl}/files/audio/${encodeURIComponent(req.file.filename)}`;
  res.json({ ok: true, url, filename: req.file.filename, size: req.file.size, mimeType: req.file.mimetype });
});

// ----------------- APP DATA (on PC) -----------------
// users.json format: [{ username, password, role, avatar, banner, following:[], followers:[], likedAlbums:[] }]
// songs.json format: [{ _id, title, artist, cover, src, platform, likes:[] }]

ensureDataFile('users.json', []);
ensureDataFile('songs.json', []);
ensureDataFile('posts.json', []);
ensureDataFile('notifications.json', []);
ensureDataFile('playlists.json', []);
ensureDataFile('artists.json', []);
ensureDataFile('genres.json', []);

function getUsers() {
  return readJson('users.json', []);
}
function setUsers(users) {
  writeJson('users.json', users);
}
function getSongs() {
  return readJson('songs.json', []);
}
function setSongs(songs) {
  writeJson('songs.json', songs);
}

function getPosts() {
  return readJson('posts.json', []);
}
function setPosts(posts) {
  writeJson('posts.json', posts);
}

function getNotifications() {
  return readJson('notifications.json', []);
}
function setNotifications(notifications) {
  writeJson('notifications.json', notifications);
}

function getPlaylists() {
  return readJson('playlists.json', []);
}
function setPlaylists(playlists) {
  writeJson('playlists.json', playlists);
}

function getArtists() {
  return readJson('artists.json', []);
}
function setArtists(artists) {
  writeJson('artists.json', artists);
}

function getGenres() {
  return readJson('genres.json', []);
}
function setGenres(genres) {
  writeJson('genres.json', genres);
}

function normalizeId(v) {
  return String(v ?? '');
}

function isAdminUser(users, username) {
  const u = users.find(x => x.username === username);
  if (!u) return false;
  return u.role === 'admin' || u.role === 'superadmin';
}

function isSuperAdminUser(users, username) {
  const u = users.find(x => x.username === username);
  if (!u) return false;
  return u.role === 'superadmin';
}

// Auth
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    id: user.id || user._id || username,
    username: user.username,
    avatar: user.avatar,
    banner: user.banner,
    role: user.role || 'user',
    following: user.following || [],
    followers: user.followers || [],
    likedAlbums: user.likedAlbums || []
  });
});

app.post('/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const users = getUsers();
  const existing = users.find(u => u.username === username);
  if (existing) return res.status(400).json({ error: 'User exists' });

  const newUser = {
    id: crypto.randomBytes(8).toString('hex'),
    username,
    password,
    role: 'user',
    avatar: '',
    banner: '',
    following: [],
    followers: [],
    likedAlbums: []
  };
  users.push(newUser);
  setUsers(users);

  res.json({
    id: newUser.id,
    username: newUser.username,
    avatar: newUser.avatar,
    banner: newUser.banner,
    role: newUser.role,
    following: [],
    followers: [],
    likedAlbums: []
  });
});

// Songs
app.get('/songs', (req, res) => {
  res.json(getSongs());
});

app.post('/songs/:id/like', (req, res) => {
  const { username } = req.body || {};
  const id = req.params.id;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const songs = getSongs();
  const song = songs.find(s => String(s._id || s.id) === String(id));
  if (!song) return res.status(404).json({ error: 'Song not found' });

  song.likes = song.likes || [];
  if (!song.likes.includes(username)) song.likes.push(username);
  setSongs(songs);

  res.json(song);
});

// Users
app.get('/users', (req, res) => {
  const users = getUsers().map(u => {
    const { password, ...rest } = u;
    return rest;
  });
  res.json(users);
});

app.get('/users/profile/:username', (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...rest } = user;
  res.json(rest);
});

app.put('/users/profile', (req, res) => {
  const { username, avatar, banner } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (typeof avatar === 'string') {
    const saved = saveDataUrlToFile(avatar, IMAGES_DIR, req, 'avatar');
    user.avatar = saved ? saved.url : avatar;
  }
  if (typeof banner === 'string') {
    const saved = saveDataUrlToFile(banner, IMAGES_DIR, req, 'banner');
    user.banner = saved ? saved.url : banner;
  }

  setUsers(users);
  const { password, ...rest } = user;
  res.json(rest);
});

// Change username
app.put('/users/:oldUsername', (req, res) => {
  const oldUsername = req.params.oldUsername;
  const { newUsername } = req.body || {};
  if (!newUsername || typeof newUsername !== 'string') return res.status(400).json({ error: 'Missing newUsername' });

  const users = getUsers();
  const user = users.find(u => u.username === oldUsername);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.username !== oldUsername);
  if (exists) return res.status(400).json({ error: 'Username already exists' });

  // Update username in users + relationship arrays
  users.forEach(u => {
    if (u.username === oldUsername) u.username = newUsername;
    if (Array.isArray(u.following)) u.following = u.following.map(x => (x === oldUsername ? newUsername : x));
    if (Array.isArray(u.followers)) u.followers = u.followers.map(x => (x === oldUsername ? newUsername : x));
    if (Array.isArray(u.likedAlbums)) u.likedAlbums = u.likedAlbums; // unchanged
  });
  setUsers(users);

  // Update references in other JSON stores
  const songs = getSongs();
  songs.forEach(s => {
    if (Array.isArray(s.likes)) s.likes = s.likes.map(x => (x === oldUsername ? newUsername : x));
  });
  setSongs(songs);

  const posts = getPosts();
  posts.forEach(p => {
    if (p.author === oldUsername) p.author = newUsername;
    if (Array.isArray(p.likes)) p.likes = p.likes.map(x => (x === oldUsername ? newUsername : x));
  });
  setPosts(posts);

  const playlists = getPlaylists();
  playlists.forEach(pl => {
    if (pl.owner === oldUsername) pl.owner = newUsername;
  });
  setPlaylists(playlists);

  const notifications = getNotifications();
  notifications.forEach(n => {
    if (n.targetUser === oldUsername) n.targetUser = newUsername;
    if (n.user === oldUsername) n.user = newUsername;
    if (n.sender === oldUsername) n.sender = newUsername;
  });
  setNotifications(notifications);

  res.json({ ok: true, oldUsername, newUsername });
});

// Admin: change role
app.post('/users/role', (req, res) => {
  const { requester, targetUser, newRole } = req.body || {};
  if (!requester || !targetUser || !newRole) return res.status(400).json({ error: 'Missing fields' });

  const users = getUsers();
  if (!isAdminUser(users, requester)) return res.status(403).json({ error: 'Forbidden' });
  if (newRole === 'superadmin' && !isSuperAdminUser(users, requester)) return res.status(403).json({ error: 'Forbidden' });

  const target = users.find(u => u.username === targetUser);
  if (!target) return res.status(404).json({ error: 'User not found' });

  target.role = newRole;
  setUsers(users);
  res.json({ ok: true, username: targetUser, role: newRole });
});

app.post('/users/follow', (req, res) => {
  const { follower, following } = req.body || {};
  if (!follower || !following) return res.status(400).json({ error: 'Missing follower/following' });

  const users = getUsers();
  const u = users.find(x => x.username === follower);
  const target = users.find(x => x.username === following);
  if (!u || !target) return res.status(404).json({ error: 'User not found' });

  u.following = u.following || [];
  target.followers = target.followers || [];

  if (!u.following.includes(following)) u.following.push(following);
  if (!target.followers.includes(follower)) target.followers.push(follower);

  setUsers(users);

  const { password, ...rest } = u;
  res.json(rest);
});

// Albums (likes stored on user.likedAlbums)
app.post('/albums/:albumName/like', (req, res) => {
  const albumName = req.params.albumName;
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.likedAlbums = Array.isArray(user.likedAlbums) ? user.likedAlbums : [];
  const idx = user.likedAlbums.indexOf(albumName);
  let liked = false;
  if (idx === -1) {
    user.likedAlbums.push(albumName);
    liked = true;
  } else {
    user.likedAlbums.splice(idx, 1);
    liked = false;
  }
  setUsers(users);
  res.json({ ok: true, liked });
});

// ----------------- SONGS CRUD -----------------
app.post('/songs', (req, res) => {
  const body = req.body || {};
  const song = body.song || body;

  const id = song.id || song._id || crypto.randomBytes(8).toString('hex');
  const createdAt = song.createdAt || Date.now();

  let cover = song.cover || '';
  if (typeof cover === 'string') {
    const saved = saveDataUrlToFile(cover, IMAGES_DIR, req, 'cover');
    if (saved) cover = saved.url;
  }

  let src = song.src || '';
  const audioData = song.audioData || body.audioData || body.audioDataSong;
  if (!src && typeof audioData === 'string') {
    const saved = saveDataUrlToFile(audioData, AUDIO_DIR, req, 'audio');
    if (saved) src = saved.url;
  }

  const songs = getSongs();
  const newSong = {
    ...song,
    id: String(id),
    createdAt,
    cover,
    src,
    likes: Array.isArray(song.likes) ? song.likes : []
  };
  songs.push(newSong);
  setSongs(songs);
  res.json(newSong);
});

app.put('/songs/:id', (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const incoming = body.song || body;

  const songs = getSongs();
  const idx = songs.findIndex(s => normalizeId(s.id || s._id) === normalizeId(id));
  if (idx === -1) return res.status(404).json({ error: 'Song not found' });

  let cover = incoming.cover;
  if (typeof cover === 'string') {
    const saved = saveDataUrlToFile(cover, IMAGES_DIR, req, 'cover');
    if (saved) cover = saved.url;
  }

  let src = incoming.src;
  const audioData = incoming.audioData || body.audioData;
  if ((!src || src.startsWith('data:')) && typeof audioData === 'string') {
    const saved = saveDataUrlToFile(audioData, AUDIO_DIR, req, 'audio');
    if (saved) src = saved.url;
  }

  songs[idx] = {
    ...songs[idx],
    ...incoming,
    id: String(songs[idx].id || songs[idx]._id || id),
    cover: typeof cover === 'string' ? cover : songs[idx].cover,
    src: typeof src === 'string' ? src : songs[idx].src
  };
  setSongs(songs);
  res.json(songs[idx]);
});

app.delete('/songs/:id', (req, res) => {
  const id = req.params.id;
  const songs = getSongs();
  const next = songs.filter(s => normalizeId(s.id || s._id) !== normalizeId(id));
  setSongs(next);
  res.json({ ok: true });
});

// ----------------- POSTS -----------------
app.get('/posts', (req, res) => {
  res.json(getPosts());
});

app.post('/posts', (req, res) => {
  const { title, content, media, type, author } = req.body || {};
  if (!author) return res.status(400).json({ error: 'Missing author' });

  let mediaUrl = media || '';
  if (typeof mediaUrl === 'string') {
    const dest = mediaUrl.startsWith('data:video/') ? MEDIA_DIR : IMAGES_DIR;
    const saved = saveDataUrlToFile(mediaUrl, dest, req, 'post');
    if (saved) mediaUrl = saved.url;
  }

  const posts = getPosts();
  const post = {
    id: String(Date.now()),
    title: title || '',
    content: content || '',
    media: mediaUrl,
    type: type || 'text',
    author,
    likes: [],
    comments: [],
    createdAt: Date.now()
  };
  posts.unshift(post);
  setPosts(posts);
  res.json(post);
});

app.delete('/posts/:id', (req, res) => {
  const id = req.params.id;
  const posts = getPosts();
  const next = posts.filter(p => normalizeId(p.id) !== normalizeId(id));
  setPosts(next);
  res.json({ ok: true });
});

app.post('/posts/:id/like', (req, res) => {
  const id = req.params.id;
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const posts = getPosts();
  const post = posts.find(p => normalizeId(p.id) === normalizeId(id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.likes = Array.isArray(post.likes) ? post.likes : [];
  const idx = post.likes.indexOf(username);
  let liked = false;
  if (idx === -1) {
    post.likes.push(username);
    liked = true;
  } else {
    post.likes.splice(idx, 1);
    liked = false;
  }
  setPosts(posts);
  res.json({ ok: true, liked });
});

// ----------------- NOTIFICATIONS -----------------
app.get('/notifications', (req, res) => {
  const { username } = req.query || {};
  const list = getNotifications();
  // If username query provided, filter; otherwise return all.
  if (username) return res.json(list.filter(n => n.targetUser === username || n.user === username));
  res.json(list);
});

app.post('/notifications', (req, res) => {
  const { targetUser, message, sender } = req.body || {};
  if (!targetUser || !message) return res.status(400).json({ error: 'Missing targetUser/message' });

  const notifications = getNotifications();
  const n = {
    id: String(Date.now()),
    targetUser,
    message,
    sender: sender || 'System',
    read: false,
    createdAt: Date.now()
  };
  notifications.unshift(n);
  setNotifications(notifications);
  res.json(n);
});

app.delete('/notifications/:id', (req, res) => {
  const id = req.params.id;
  const notifications = getNotifications();
  const next = notifications.filter(n => normalizeId(n.id) !== normalizeId(id));
  setNotifications(next);
  res.json({ ok: true });
});

// ----------------- GENRES -----------------
app.get('/genres', (req, res) => {
  res.json(getGenres());
});

app.post('/genres', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const genres = getGenres();
  if (!genres.some(g => (g.name || g) === name)) genres.push({ name });
  setGenres(genres);
  res.json({ ok: true });
});

app.delete('/genres/:name', (req, res) => {
  const name = req.params.name;
  const genres = getGenres();
  const next = genres.filter(g => (g.name || g) !== name);
  setGenres(next);
  res.json({ ok: true });
});

// ----------------- ARTISTS -----------------
app.get('/artists', (req, res) => {
  res.json(getArtists());
});

app.get('/artists/:name', (req, res) => {
  const name = req.params.name;
  const artists = getArtists();
  const a = artists.find(x => (x.name || '').toLowerCase() === String(name).toLowerCase());
  if (!a) return res.status(404).json({ error: 'Artist not found' });
  res.json(a);
});

app.post('/artists', (req, res) => {
  const { name, avatar, banner } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });

  let avatarUrl = avatar || '';
  if (typeof avatarUrl === 'string') {
    const saved = saveDataUrlToFile(avatarUrl, IMAGES_DIR, req, 'artist_avatar');
    if (saved) avatarUrl = saved.url;
  }
  let bannerUrl = banner || '';
  if (typeof bannerUrl === 'string') {
    const saved = saveDataUrlToFile(bannerUrl, IMAGES_DIR, req, 'artist_banner');
    if (saved) bannerUrl = saved.url;
  }

  const artists = getArtists();
  const existing = artists.find(a => (a.name || '').toLowerCase() === String(name).toLowerCase());
  if (existing) {
    existing.name = name;
    if (typeof avatarUrl === 'string') existing.avatar = avatarUrl;
    if (typeof bannerUrl === 'string') existing.banner = bannerUrl;
  } else {
    artists.push({ name, avatar: avatarUrl, banner: bannerUrl, followersCount: 0 });
  }
  setArtists(artists);
  res.json({ ok: true });
});

// ----------------- PLAYLISTS -----------------
app.get('/playlists', (req, res) => {
  res.json(getPlaylists());
});

app.post('/playlists', (req, res) => {
  const { name, owner, cover, isPublic } = req.body || {};
  if (!name || !owner) return res.status(400).json({ error: 'Missing name/owner' });

  let coverUrl = cover || '';
  if (typeof coverUrl === 'string') {
    const saved = saveDataUrlToFile(coverUrl, IMAGES_DIR, req, 'playlist_cover');
    if (saved) coverUrl = saved.url;
  }

  const playlists = getPlaylists();
  const pl = {
    id: crypto.randomBytes(8).toString('hex'),
    name,
    owner,
    cover: coverUrl,
    songs: [],
    isPublic: !!isPublic,
    createdAt: Date.now()
  };
  playlists.push(pl);
  setPlaylists(playlists);
  res.json(pl);
});

app.put('/playlists/:id', (req, res) => {
  const id = req.params.id;
  const { name, cover, isPublic } = req.body || {};
  const playlists = getPlaylists();
  const pl = playlists.find(p => normalizeId(p.id) === normalizeId(id));
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  if (typeof name === 'string' && name.trim()) pl.name = name.trim();
  if (typeof isPublic === 'boolean') pl.isPublic = isPublic;
  if (typeof cover === 'string') {
    let coverUrl = cover;
    const saved = saveDataUrlToFile(coverUrl, IMAGES_DIR, req, 'playlist_cover');
    if (saved) coverUrl = saved.url;
    pl.cover = coverUrl;
  }

  setPlaylists(playlists);
  res.json(pl);
});

app.delete('/playlists/:id', (req, res) => {
  const id = req.params.id;
  const playlists = getPlaylists();
  const next = playlists.filter(p => normalizeId(p.id) !== normalizeId(id));
  setPlaylists(next);
  res.json({ ok: true });
});

app.post('/playlists/:id/songs', (req, res) => {
  const id = req.params.id;
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ error: 'Missing songId' });

  const playlists = getPlaylists();
  const pl = playlists.find(p => normalizeId(p.id) === normalizeId(id));
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  pl.songs = Array.isArray(pl.songs) ? pl.songs : [];
  if (!pl.songs.includes(songId)) pl.songs.push(songId);
  setPlaylists(playlists);
  res.json(pl);
});

app.delete('/playlists/:id/songs/:songId', (req, res) => {
  const id = req.params.id;
  const songId = req.params.songId;
  const playlists = getPlaylists();
  const pl = playlists.find(p => normalizeId(p.id) === normalizeId(id));
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  pl.songs = Array.isArray(pl.songs) ? pl.songs : [];
  pl.songs = pl.songs.filter(sid => normalizeId(sid) !== normalizeId(songId));
  setPlaylists(playlists);
  res.json(pl);
});

// Serve index.html locally too (optional)
app.use(express.static(__dirname));

app.listen(PORT, () => {
  const tokenSet = !!(process.env.PC_STORAGE_TOKEN || '').trim();
  // eslint-disable-next-line no-console
  console.log(`🖥️ PC app server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📦 Data: ${DATA_DIR}`);
  // eslint-disable-next-line no-console
  console.log(`📁 Uploads: ${STORAGE_ROOT}`);
  // eslint-disable-next-line no-console
  console.log(`🔐 Token required: ${tokenSet ? 'YES' : 'NO (NOT SAFE)'}`);
});
