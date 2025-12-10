#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Clé de chiffrement (à remplacer par une vraie clé sécurisée ou variable d'env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

console.log('🔐 Encryption Key:', ENCRYPTION_KEY);
console.log('⚠️  Keep this key safe! Add it to Railway environment variables as ENCRYPTION_KEY');

const files = ['users.json', 'songs.json', 'posts.json', 'notifications.json', 'playlists.json', 'artists.json'];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found, skipping...`);
    return;
  }

  const data = fs.readFileSync(filePath, 'utf8');
  
  // Générer IV aléatoire
  const iv = crypto.randomBytes(16);
  
  // Créer cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  // Chiffrer
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Sauvegarder: IV + encrypted
  const result = iv.toString('hex') + ':' + encrypted;
  fs.writeFileSync(filePath + '.enc', result);
  
  console.log(`✅ ${file} encrypted -> ${file}.enc`);
});

console.log('\n✅ Done! All files encrypted.');
console.log('📝 Next steps:');
console.log('1. Commit and push .enc files to GitHub');
console.log('2. Add ENCRYPTION_KEY to Railway environment variables');
console.log('3. Update server.js to decrypt on startup');
