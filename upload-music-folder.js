#!/usr/bin/env node
/**
 * Upload all audio files from local folder to Cloudinary
 * and update the database with the URLs
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Folder with audio files
const MUSIC_FOLDER = 'C:\\Users\\xdhne\\Music\\Musique';

console.log('🎵 Starting audio file upload to Cloudinary...');
console.log('📁 Source folder:', MUSIC_FOLDER);
console.log('☁️ Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

// Read all audio files
const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
let audioFiles = [];

if (fs.existsSync(MUSIC_FOLDER)) {
  const files = fs.readdirSync(MUSIC_FOLDER);
  audioFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return audioExtensions.includes(ext);
  });
  console.log(`📊 Found ${audioFiles.length} audio files\n`);
} else {
  console.error(`❌ Folder not found: ${MUSIC_FOLDER}`);
  process.exit(1);
}

async function uploadToCloudinary(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'spider-music/uploads',
        public_id: `${Date.now()}_${fileName.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}`,
        quality: 'auto',
        timeout: 60000
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    // Read file and upload
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(stream);
  });
}

async function updateSongDatabase(fileName, cloudinaryUrl) {
  try {
    // Read songs.json
    const songsFile = path.join(__dirname, 'songs.json');
    if (!fs.existsSync(songsFile)) {
      console.warn(`⚠️  songs.json not found`);
      return false;
    }

    let songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'));

    // Find matching song by title (fuzzy match)
    const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
    const song = songs.find(s => {
      const songTitle = s.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fileName = fileNameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '');
      return songTitle === fileName || s.title.toLowerCase().includes(fileNameWithoutExt.toLowerCase());
    });

    if (song) {
      song.src = cloudinaryUrl;
      song.platform = 'cloudinary';
      song.externalId = cloudinaryUrl.split('/').pop();

      // Save updated songs.json
      fs.writeFileSync(songsFile, JSON.stringify(songs, null, 2));
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error updating database:', err.message);
    return false;
  }
}

async function uploadAll() {
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < audioFiles.length; i++) {
    const fileName = audioFiles[i];
    const filePath = path.join(MUSIC_FOLDER, fileName);
    const progress = `[${i + 1}/${audioFiles.length}]`;

    try {
      console.log(`📤 ${progress} Uploading ${fileName}...`);

      const result = await uploadToCloudinary(filePath, fileName);
      const cloudinaryUrl = result.secure_url;

      // Try to update database
      const updated = await updateSongDatabase(fileName, cloudinaryUrl);

      if (updated) {
        console.log(`✅ ${progress} ${fileName} uploaded and database updated`);
      } else {
        console.log(`⚠️  ${progress} ${fileName} uploaded to Cloudinary but no matching song found`);
        console.log(`    URL: ${cloudinaryUrl}`);
      }

      uploaded++;

      // Add delay between uploads to avoid rate limiting
      if (i < audioFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`❌ ${progress} Error uploading ${fileName}:`, err.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Upload Summary:');
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));

  if (uploaded > 0) {
    console.log('\n💡 Restart the server to see the changes!');
    console.log('   Command: node server.js');
  }

  process.exit(0);
}

uploadAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
