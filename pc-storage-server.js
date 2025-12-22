#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

const PORT = parseInt(process.env.PC_STORAGE_PORT || process.env.PORT, 10) || 5050;
const ROOT_DIR = process.env.PC_STORAGE_ROOT
  ? path.resolve(process.env.PC_STORAGE_ROOT)
  : path.join(__dirname, 'pc_uploads');

const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

app.use(cors({ origin: true }));

function getPublicBaseUrl(req) {
  // Prefer explicit public URL (tunnel / domain), because req.protocol may be http behind a tunnel.
  const configured = (process.env.PC_PUBLIC_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function requireUploadToken(req, res, next) {
  const expected = (process.env.PC_STORAGE_TOKEN || '').trim();
  if (!expected) return next(); // Not secure, but allows local quick start.

  const provided = (req.get('x-storage-token') || '').trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function safeExt(originalName, mimeType) {
  const extFromName = path.extname(originalName || '').slice(0, 12);
  if (extFromName && /^[.a-zA-Z0-9]+$/.test(extFromName)) return extFromName;

  // Very small mime → ext mapping fallback
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
    limits: {
      fileSize: 60 * 1024 * 1024 // 60MB
    }
  });
}

const uploadImage = makeUploader(IMAGES_DIR);
const uploadAudio = makeUploader(AUDIO_DIR);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    imagesDir: IMAGES_DIR,
    audioDir: AUDIO_DIR,
    tokenRequired: !!(process.env.PC_STORAGE_TOKEN || '').trim(),
    publicBaseUrl: (process.env.PC_PUBLIC_BASE_URL || '').trim() || null
  });
});

app.use('/files/images', express.static(IMAGES_DIR, { fallthrough: false }));
app.use('/files/audio', express.static(AUDIO_DIR, { fallthrough: false }));

app.post('/upload/image', requireUploadToken, uploadImage.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });

  const baseUrl = getPublicBaseUrl(req);
  const url = `${baseUrl}/files/images/${encodeURIComponent(req.file.filename)}`;

  res.json({
    ok: true,
    url,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});

app.post('/upload/audio', requireUploadToken, uploadAudio.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });

  const baseUrl = getPublicBaseUrl(req);
  const url = `${baseUrl}/files/audio/${encodeURIComponent(req.file.filename)}`;

  res.json({
    ok: true,
    url,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});

app.listen(PORT, () => {
  const tokenSet = !!(process.env.PC_STORAGE_TOKEN || '').trim();
  // eslint-disable-next-line no-console
  console.log(`🕷️ PC storage server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📁 Root: ${ROOT_DIR}`);
  // eslint-disable-next-line no-console
  console.log(`🔐 Upload token required: ${tokenSet ? 'YES' : 'NO (NOT SAFE)'}`);
});
