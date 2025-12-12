#!/usr/bin/env node
/**
 * Smart upload script that updates songs.json with Cloudinary URLs
 * without needing to upload every file - just maps existing uploads
 */

const fs = require('fs');
const path = require('path');

console.log('🎵 Smart Music Upload Update Script\n');

// Read the current songs.json
const songsFile = path.join(__dirname, 'songs.json');
let songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'));

// List of Cloudinary URLs we've already uploaded (from the upload script)
const cloudinaryUploads = {
  'Aloboi - Give Me More (Just Rawer) Gonio Visual': 'https://res.cloudinary.com/spider-music/video/upload/v1765563697/spider-music/uploads/1765563696813_Aloboi___Give_Me_More__Just_Rawer__Gonio_Visual_mp.mp3',
  'Aloboi - Want To Love (Just Raw)': 'https://res.cloudinary.com/spider-music/video/upload/v1765563704/spider-music/uploads/1765563704475_Aloboi___Want_To_Love__Just_Raw__mp3.mp3',
  'The Pointer Sisters - Hot Together': 'https://res.cloudinary.com/spider-music/video/upload/v1765562748/spider-music/uploads/1765562747387_The_Pointer_Sisters___Hot_Together__GTA_VI_Trailer.mp3'
};

let updated = 0;
let notFound = 0;

// Try to match and update songs
Object.entries(cloudinaryUploads).forEach(([fileName, url]) => {
  // Try to find matching song
  const song = songs.find(s => {
    const sTitle = s.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sTitle.includes(fName) || fName.includes(sTitle) || s.artist + ' - ' + s.title === fileName;
  });

  if (song) {
    console.log(`✅ Updating: ${song.title} by ${song.artist}`);
    song.src = url;
    song.platform = 'cloudinary';
    updated++;
  } else {
    console.log(`❌ Not found: ${fileName}`);
    notFound++;
  }
});

// Save updated songs.json
fs.writeFileSync(songsFile, JSON.stringify(songs, null, 2));

console.log(`\n============================================================`);
console.log(`📊 Results:`);
console.log(`✅ Updated: ${updated}`);
console.log(`❌ Not found: ${notFound}`);
console.log(`============================================================`);
console.log(`💾 Saved to songs.json`);
console.log(`🚀 Ready to push to GitHub and deploy!`);
