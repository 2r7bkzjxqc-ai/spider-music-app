#!/usr/bin/env node
/**
 * Convert base64 songs to Cloudinary
 * Reads from local JSON files and uploads to Cloudinary
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🎵 Starting Cloudinary migration...');
console.log('☁️ Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

// Read songs from JSON
const songsFile = path.join(__dirname, 'songs.json');
if (!fs.existsSync(songsFile)) {
  console.error('❌ songs.json not found');
  process.exit(1);
}

let songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'));
console.log(`📊 Found ${songs.length} songs`);

async function uploadToCloudinary(buffer, songTitle) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'spider-music/migrated',
        public_id: `${Date.now()}_${songTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}`,
        quality: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function migrate() {
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const progress = `[${i + 1}/${songs.length}]`;

    try {
      // Skip if already on Cloudinary
      if (song.src && song.src.includes('cloudinary.com')) {
        console.log(`⏭️  ${progress} ${song.title} (already on Cloudinary)`);
        skipped++;
        continue;
      }

      // Skip if no src
      if (!song.src) {
        console.log(`⏭️  ${progress} ${song.title} (no audio)`);
        skipped++;
        continue;
      }

      console.log(`📤 ${progress} Uploading ${song.title}...`);

      // Check if base64
      if (song.src.startsWith('data:audio')) {
        const base64Data = song.src.replace(/^data:audio\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const result = await uploadToCloudinary(buffer, song.title);
        
        song.src = result.secure_url;
        song.platform = 'cloudinary';
        song.externalId = result.public_id;
        
        console.log(`✅ ${progress} ${song.title} ✓`);
        migrated++;
      } else {
        console.log(`⏭️  ${progress} ${song.title} (not base64)`);
        skipped++;
      }
    } catch (err) {
      console.error(`❌ ${progress} ${song.title}: ${err.message}`);
      failed++;
    }
  }

  // Save updated songs
  if (migrated > 0) {
    fs.writeFileSync(songsFile, JSON.stringify(songs, null, 2));
    console.log(`\n✅ Saved ${songs.length} songs to songs.json`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Migrated:', migrated);
  console.log('⏭️  Skipped:', skipped);
  console.log('❌ Failed:', failed);
  console.log('='.repeat(50));

  process.exit(0);
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
