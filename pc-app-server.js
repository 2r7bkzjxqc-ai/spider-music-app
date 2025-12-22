#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

const PORT = parseInt(process.env.PC_APP_PORT || process.env.PORT, 10) || 5050;

// Data + storage live on your PC
const DATA_DIR = process.env.PC_DATA_DIR
  ? path.resolve(process.env.PC_DATA_DIR)
  : path.join(__dirname, 'pc_data');

const STORAGE_ROOT = process.env.PC_STORAGE_ROOT
  ? path.resolve(process.env.PC_STORAGE_ROOT)
  : path.join(__dirname, 'pc_uploads');

const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
const AUDIO_DIR = path.join(STORAGE_ROOT, 'audio');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
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
  return '';
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

  if (typeof avatar === 'string') user.avatar = avatar;
  if (typeof banner === 'string') user.banner = banner;

  setUsers(users);
  const { password, ...rest } = user;
  res.json(rest);
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

// Serve index.html locally too (optional)
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
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
