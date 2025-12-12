#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config();

// Song Schema
const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  genre: String,
  cover: String,
  src: String,
  duration: { type: Number, default: 0 },
  likes: [String],
  createdAt: Number,
  id: String,
  platform: String,
  externalId: String,
  externalUrl: String,
  audioData: String,
  audioSize: Number
});

const Song = mongoose.model('Song', songSchema);

async function cleanMongoDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Get all songs
    const allSongs = await Song.find();
    console.log(`\n📊 Total songs in MongoDB: ${allSongs.length}`);

    // Filter: Keep only SoundCloud songs
    const soundcloudSongs = allSongs.filter(s => 
      s.src && s.src.includes('soundcloud')
    );

    console.log(`🎵 SoundCloud songs: ${soundcloudSongs.length}`);
    soundcloudSongs.forEach(s => {
      console.log(`  ✓ ${s.title} - ${s.artist}`);
    });

    // Delete all non-SoundCloud songs
    const songsToDelete = allSongs.length - soundcloudSongs.length;
    console.log(`\n🗑️  Deleting ${songsToDelete} non-SoundCloud songs...`);

    const result = await Song.deleteMany({
      $or: [
        { src: { $exists: false } },
        { src: { $exists: true, $not: /soundcloud/ } }
      ]
    });

    console.log(`✅ Deleted: ${result.deletedCount} songs`);

    // Verify final count
    const finalCount = await Song.countDocuments();
    console.log(`\n📊 Final count in MongoDB: ${finalCount}`);
    console.log('✅ MongoDB cleaned successfully!');

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanMongoDB();
