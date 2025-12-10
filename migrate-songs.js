const fs = require('fs');
const path = require('path');

// Script pour migrer songs.json.bak (base64) vers fichiers + songs.json (chemins)

const bakFile = path.join(__dirname, 'songs.json.bak');
const uploadsDir = path.join(__dirname, 'uploads', 'audio');
const songsFile = path.join(__dirname, 'songs.json');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('📂 Lecture de songs.json.bak...');

// Lecture du fichier .bak avec un stream pour éviter de charger les 481MB en mémoire
let bakContent = '';
const readStream = fs.createReadStream(bakFile, { encoding: 'utf8', highWaterMark: 1024 * 1024 }); // 1MB chunks

readStream.on('data', (chunk) => {
    bakContent += chunk;
});

readStream.on('end', () => {
    console.log(`✅ Fichier .bak lu (${(bakContent.length / 1024 / 1024).toFixed(2)} MB de texte)`);
    
    let bakSongs;
    try {
        bakSongs = JSON.parse(bakContent);
    } catch (e) {
        console.error('❌ Erreur parsing JSON:', e.message);
        process.exit(1);
    }

    console.log(`🎵 ${bakSongs.length} chansons trouvées`);

    const migratedSongs = [];
    let converted = 0;
    let skipped = 0;
    let errors = 0;

    for (const song of bakSongs) {
        try {
            const newSong = { ...song };

            // Si le src est une data URL (base64)
            if (newSong.src && typeof newSong.src === 'string' && newSong.src.startsWith('data:')) {
                const matches = newSong.src.match(/^data:(.+);base64,(.+)$/);
                if (matches) {
                    const mime = matches[1];
                    const base64 = matches[2];
                    const ext = (mime.split('/')[1] || 'mp3').split(';')[0];
                    
                    // Conversion base64 → Buffer
                    const buffer = Buffer.from(base64, 'base64');
                    const filename = `migrated_${song.id || Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                    const filePath = path.join(uploadsDir, filename);
                    
                    // Écriture du fichier audio
                    fs.writeFileSync(filePath, buffer);
                    
                    // Remplacer src par le chemin relatif
                    newSong.src = `/uploads/audio/${filename}`;
                    converted++;
                    console.log(`  ✓ ${song.title || 'Sans titre'} → ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
                } else {
                    // Data URL invalide
                    skipped++;
                    console.log(`  ⚠️ ${song.title || 'Sans titre'} - Data URL invalide, conservé tel quel`);
                }
            } else if (newSong.src && newSong.src.startsWith('http')) {
                // URL externe (SoundCloud, etc.) - on garde
                skipped++;
                console.log(`  → ${song.title || 'Sans titre'} - URL externe conservée`);
            } else {
                // Pas de src ou déjà un chemin fichier
                skipped++;
            }

            migratedSongs.push(newSong);
        } catch (err) {
            errors++;
            console.error(`  ❌ Erreur avec "${song.title || 'Sans titre'}":`, err.message);
            // On garde quand même le son original
            migratedSongs.push(song);
        }
    }

    // Sauvegarde du nouveau songs.json
    console.log('\n💾 Sauvegarde de songs.json...');
    fs.writeFileSync(songsFile, JSON.stringify(migratedSongs, null, 2));

    console.log('\n✅ MIGRATION TERMINÉE');
    console.log(`   Converties: ${converted}`);
    console.log(`   Ignorées: ${skipped}`);
    console.log(`   Erreurs: ${errors}`);
    console.log(`   Total: ${migratedSongs.length} chansons`);

    // Statistiques taille
    const oldSize = (fs.statSync(bakFile).size / 1024 / 1024).toFixed(2);
    const newSize = (fs.statSync(songsFile).size / 1024 / 1024).toFixed(2);
    console.log(`\n📊 Taille fichier:`);
    console.log(`   Avant: ${oldSize} MB (songs.json.bak)`);
    console.log(`   Après: ${newSize} MB (songs.json)`);
    console.log(`   Gain: ${(oldSize - newSize).toFixed(2)} MB (-${((1 - newSize/oldSize) * 100).toFixed(1)}%)`);
});

readStream.on('error', (err) => {
    console.error('❌ Erreur lecture fichier:', err.message);
    process.exit(1);
});
