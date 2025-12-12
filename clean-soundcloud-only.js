#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const songsPath = path.join(__dirname, 'songs.json');

// Read songs.json
const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

console.log(`📊 Total songs before: ${songs.length}`);

// Filter: Keep only SoundCloud songs
const soundcloudSongs = songs.filter(s => 
  s.src && s.src.includes('soundcloud')
);

console.log(`\n🎵 SoundCloud songs found: ${soundcloudSongs.length}`);
soundcloudSongs.forEach(s => {
  console.log(`  ✓ ${s.title} - ${s.artist}`);
});

// Write back to file
fs.writeFileSync(songsPath, JSON.stringify(soundcloudSongs, null, 2));

console.log(`\n✅ songs.json cleaned!`);
console.log(`📊 Total songs after: ${soundcloudSongs.length}`);
