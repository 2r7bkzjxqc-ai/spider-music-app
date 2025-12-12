#!/usr/bin/env node
/**
 * Clean songs.json - Remove broken local file references
 * Keep only songs with valid external URLs (SoundCloud, Spotify, etc.)
 */

const fs = require('fs');
const path = require('path');

const songsFile = path.join(__dirname, 'songs.json');
let songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'));

// Filter: keep only songs with external URLs or no src
const cleanedSongs = songs.map(song => {
  // If src is an external URL (http/https/SoundCloud), keep it
  if (song.src && (song.src.startsWith('http') || song.src.includes('soundcloud'))) {
    return song;
  }
  
  // Otherwise remove the src field so it can be added later via upload
  const cleanedSong = { ...song };
  delete cleanedSong.src;
  delete cleanedSong.platform;
  delete cleanedSong.externalId;
  delete cleanedSong.externalUrl;
  return cleanedSong;
});

// Save cleaned songs
fs.writeFileSync(songsFile, JSON.stringify(cleanedSongs, null, 2));

console.log(`✅ Cleaned songs.json`);
console.log(`📊 Total songs: ${cleanedSongs.length}`);
console.log(`🔗 Songs with external URLs: ${cleanedSongs.filter(s => s.src).length}`);
console.log(`📤 Songs ready for upload: ${cleanedSongs.filter(s => !s.src).length}`);
