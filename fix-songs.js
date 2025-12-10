const fs = require('fs');
const path = require('path');

// Script pour récupérer les métadonnées du .bak et créer un songs.json propre

const bakFile = path.join(__dirname, 'songs.json.bak');
const uploadsDir = path.join(__dirname, 'uploads', 'audio');
const songsFile = path.join(__dirname, 'songs.json');

console.log('📂 Chargement des métadonnées depuis songs.json.bak...');
console.log('⚠️  Ceci peut prendre du temps (fichier de 481 MB)...\n');

// On lit le .bak morceau par morceau
let bakContent = '';
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks
const fd = fs.openSync(bakFile, 'r');
const stats = fs.statSync(bakFile);
let bytesRead = 0;

while (bytesRead < stats.size) {
    const buffer = Buffer.alloc(Math.min(CHUNK_SIZE, stats.size - bytesRead));
    fs.readSync(fd, buffer, 0, buffer.length, bytesRead);
    bakContent += buffer.toString('utf8');
    bytesRead += buffer.length;
    const progress = ((bytesRead / stats.size) * 100).toFixed(1);
    process.stdout.write(`\rLecture: ${progress}%`);
}
fs.closeSync(fd);
console.log('\n\n✅ Fichier .bak chargé');

// Parser le JSON
console.log('🔍 Parsing du JSON...');
const bakSongs = JSON.parse(bakContent);
console.log(`✅ ${bakSongs.length} sons trouvés dans le backup\n`);

// Créer une map des fichiers existants
console.log('📁 Scan des fichiers dans uploads/audio...');
const audioFiles = fs.readdirSync(uploadsDir);
const fileMap = {};
audioFiles.forEach(f => {
    // Extract ID from migrated filename: migrated_{ID}_{random}.ext
    const match = f.match(/^migrated_(\d+)_[a-z0-9]+\./i);
    if (match) {
        const originalId = match[1];
        fileMap[originalId] = `/uploads/audio/${f}`;
    } else {
        // New upload files: timestamp-random.ext
        fileMap[f] = `/uploads/audio/${f}`;
    }
});
console.log(`✅ ${audioFiles.length} fichiers audio trouvés\n`);

// Nettoyer les sons: garder métadonnées, remplacer src
const cleanSongs = bakSongs.map(song => {
    const cleanSong = { ...song };
    
    // Si le son a un ID qui correspond à un fichier migré
    if (fileMap[cleanSong.id]) {
        cleanSong.src = fileMap[cleanSong.id];
        return cleanSong;
    }
    
    // Si le src est une URL externe (SoundCloud, etc.), le garder
    if (cleanSong.src && cleanSong.src.startsWith('http')) {
        return cleanSong;
    }
    
    // Sinon, pas de fichier trouvé
    console.log(`⚠️  Pas de fichier pour: ${song.title} (ID: ${song.id})`);
    cleanSong.src = '';
    return cleanSong;
});

// Filtrer les sons sans src
const validSongs = cleanSongs.filter(s => s.src);
console.log(`\n🎵 ${validSongs.length} sons avec fichiers valides`);

console.log('\n💾 Sauvegarde de songs.json...');
fs.writeFileSync(songsFile, JSON.stringify(validSongs, null, 2));

const newSize = (fs.statSync(songsFile).size / 1024 / 1024).toFixed(2);
console.log(`✅ songs.json créé (${newSize} MB)`);
console.log(`\n📊 Résumé:`);
console.log(`   Total backup: ${bakSongs.length} sons`);
console.log(`   Récupérés: ${validSongs.length} sons`);
console.log(`   Perdus: ${bakSongs.length - validSongs.length} sons (pas de fichier)`);
