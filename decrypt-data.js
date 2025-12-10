#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Decrypt encrypted JSON files
 * Usage: ENCRYPTION_KEY=<key> node decrypt-data.js
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY environment variable not set!');
  process.exit(1);
}

if (ENCRYPTION_KEY.length !== 64) {
  console.error('❌ ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  process.exit(1);
}

const files = ['users.json', 'songs.json', 'posts.json', 'notifications.json', 'playlists.json', 'artists.json'];

files.forEach(file => {
  const encPath = path.join(__dirname, file + '.enc');
  if (!fs.existsSync(encPath)) {
    console.log(`⚠️  ${file}.enc not found, skipping...`);
    return;
  }

  try {
    const data = fs.readFileSync(encPath, 'utf8');
    const [ivHex, encrypted] = data.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    fs.writeFileSync(path.join(__dirname, file), decrypted);
    console.log(`✅ ${file}.enc decrypted -> ${file}`);
  } catch (err) {
    console.error(`❌ Failed to decrypt ${file}.enc:`, err.message);
  }
});

console.log('✅ Decryption complete!');
