#!/usr/bin/env node
/**
 * Migrate songs from base64 to Cloudinary URLs
 * This script converts base64 audio data to files and uploads them to Cloudinary
 */

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spider-music';

// Define Song Schema
const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  genre: String,
  album: String,
  cover: String,
  src: String,
  platform: { type: String, default: 'local' },
  externalId: String,
  externalUrl: String,
  duration: Number,
  likes: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Song = mongoose.model('Song', songSchema);

async function migrateToCloudinary() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    // Get all songs
    console.log('📥 Fetching songs from MongoDB...');
    const songs = await Song.find();
    console.log(`📊 Found ${songs.length} songs`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const progress = `[${i + 1}/${songs.length}]`;

      try {
        // Skip if already has Cloudinary URL
        if (song.src && song.src.includes('cloudinary.com')) {
          console.log(`⏭️  ${progress} Skipping ${song.title} (already on Cloudinary)`);
          skipped++;
          continue;
        }

        // Skip if no src
        if (!song.src) {
          console.log(`⏭️  ${progress} Skipping ${song.title} (no audio source)`);
          skipped++;
          continue;
        }

        console.log(`📤 ${progress} Uploading ${song.title}...`);

        // Check if src is base64
        if (song.src.startsWith('data:audio')) {
          // Convert base64 to buffer
          const base64Data = song.src.replace(/^data:audio\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const tempFile = path.join('/tmp', `${Date.now()}_${song.title.replace(/\s+/g, '_')}.mp3`);

          // Write to temp file
          fs.writeFileSync(tempFile, buffer);

          // Upload to Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'auto',
                folder: 'spider-music/migrated',
                public_id: `${Date.now()}_${song.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}`,
                quality: 'auto'
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            stream.end(buffer);
          });

          // Update song in MongoDB
          song.src = result.secure_url;
          song.platform = 'cloudinary';
          song.externalId = result.public_id;
          song.duration = result.duration || song.duration || 0;
          await song.save();

          // Clean up temp file
          fs.unlinkSync(tempFile);

          console.log(`✅ ${progress} Migrated ${song.title} -> ${result.secure_url}`);
          migrated++;
        } else if (song.src.startsWith('/audio')) {
          // Local file reference - try to read from disk
          console.log(`⏭️  ${progress} Skipping ${song.title} (local file reference, needs manual upload)`);
          skipped++;
        } else {
          // Already has URL
          console.log(`⏭️  ${progress} Skipping ${song.title} (already has URL)`);
          skipped++;
        }
      } catch (err) {
        console.error(`❌ ${progress} Error migrating ${song.title}:`, err.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

// Run migration
migrateToCloudinary();
