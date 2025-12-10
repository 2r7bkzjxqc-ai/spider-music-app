# Spider Music - Sensitive Data Encryption

## Overview
All sensitive JSON files (users, songs, posts, etc.) are encrypted with AES-256-CBC before being committed to GitHub.

## Files
- `users.json.enc` - Encrypted user accounts
- `songs.json.enc` - Encrypted songs database
- `posts.json.enc` - Encrypted posts
- `notifications.json.enc` - Encrypted notifications
- `playlists.json.enc` - Encrypted playlists
- `artists.json.enc` - Encrypted artists
- `encrypt-data.js` - Script to encrypt JSON files
- `decrypt-data.js` - Script to decrypt JSON files

## Setup Instructions

### 1. Add Encryption Key to Railway
Set the environment variable on Railway:
```
ENCRYPTION_KEY=eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d
```

### 2. Local Development
Decrypt files locally for development:
```bash
ENCRYPTION_KEY=eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d node decrypt-data.js
```

This will create unencrypted `.json` files. **DO NOT commit these to GitHub.**

### 3. Before Pushing Changes
If you modified any JSON files locally, re-encrypt them:
```bash
ENCRYPTION_KEY=eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d node encrypt-data.js
```

## Security Notes
⚠️ **Keep the encryption key secret!**
- Store it only in Railway environment variables
- Never commit it to the repository
- Use a strong, unique key in production

## How It Works
1. **On startup**: `server.js` checks for encrypted `.enc` files
2. **With ENCRYPTION_KEY**: Decrypts files automatically using AES-256-CBC
3. **Without ENCRYPTION_KEY**: Falls back to unencrypted `.json` files (local dev)
4. **Migrations**: Data is automatically migrated to MongoDB on first run

## Changing the Encryption Key
If you need to rotate the key:
1. Decrypt with old key: `ENCRYPTION_KEY=old_key node decrypt-data.js`
2. Encrypt with new key: `ENCRYPTION_KEY=new_key node encrypt-data.js`
3. Update Railway environment variable
4. Commit new `.enc` files
