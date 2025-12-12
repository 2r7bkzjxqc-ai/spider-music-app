# Cloudinary Integration - Utilisation Guide

## ✅ Status: Fully Configured & Ready

Votre compte Cloudinary est maintenant intégré à Spider Music!

### Cloud Name
```
741567951621919
```

### Upload Preset
```
spider-music
```

## 🎵 API Endpoints

### 1. **Test Cloudinary Configuration**
```
GET /api/test/cloudinary
```
Response:
```json
{
  "status": "Cloudinary configured ✅",
  "cloud_name": "741567951621919",
  "upload_preset": "spider-music"
}
```

### 2. **Upload Audio File**
```
POST /api/upload/audio
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (binary) - Audio file (MP3, WAV, FLAC, OGG) - REQUIRED
- `title` (string) - Song title - REQUIRED
- `artist` (string) - Artist name - OPTIONAL
- `album` (string) - Album name - OPTIONAL

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/api/upload/audio \
  -F "file=@/path/to/song.mp3" \
  -F "title=My Song" \
  -F "artist=My Artist" \
  -F "album=My Album"
```

**Response:**
```json
{
  "message": "Audio uploaded successfully",
  "song": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "My Song",
    "artist": "My Artist",
    "src": "https://res.cloudinary.com/..../song.mp3",
    "platform": "cloudinary",
    "externalId": "spider-music/...",
    "duration": 234
  },
  "cloudinary": {
    "public_id": "spider-music/...",
    "url": "https://res.cloudinary.com/..../song.mp3",
    "duration": 234
  }
}
```

### 3. **Get All Uploaded Songs (Cloudinary)**
```
GET /api/songs/platform/cloudinary
```

### 4. **Add SoundCloud Track**
```
POST /api/soundcloud/add
Content-Type: application/json
```

**Parameters:**
- `trackId` - SoundCloud track ID
- `title` - Track title
- `artist` - Artist name
- `cover` - Cover image URL
- `src` - Stream URL
- `duration` - Duration in seconds

### 5. **Get All Songs by Platform**
```
GET /api/songs/platform/soundcloud
GET /api/songs/platform/local
GET /api/songs/platform/cloudinary
```

## 🧪 Testing

### Quick Test UI
Open in your browser:
```
http://localhost:3000/upload-test.html
```

This interface allows you to:
1. ✅ Test Cloudinary configuration
2. 🎵 Upload audio files directly
3. 📊 View upload responses

### Command Line Testing

**Test Cloudinary Config:**
```bash
curl http://localhost:3000/api/test/cloudinary
```

**Upload File (PowerShell):**
```powershell
$file = Get-Item "C:\path\to\song.mp3"
$form = @{
    file = [System.IO.File]::ReadAllBytes($file.FullName)
    title = "Song Title"
    artist = "Artist Name"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/upload/audio" `
  -Method Post `
  -Form $form
```

## 🚀 Frontend Integration

### Example Upload Form
```html
<form id="uploadForm">
    <input type="text" id="title" placeholder="Song title" required>
    <input type="text" id="artist" placeholder="Artist name">
    <input type="file" id="file" accept="audio/*" required>
    <button type="submit">Upload</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('file', document.getElementById('file').files[0]);
    formData.append('title', document.getElementById('title').value);
    formData.append('artist', document.getElementById('artist').value);
    
    const response = await fetch('/api/upload/audio', {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    console.log('Song saved:', data.song);
});
</script>
```

## 📊 Storage Limits

**Free Tier:**
- 25 GB monthly uploads
- Unlimited transformations
- Up to 10 GB storage
- Perfect for your use case ✅

## 🔒 Security

Your credentials are:
- ✅ Safely stored in `.env` (never committed to GitHub)
- ✅ Loaded via dotenv at startup
- ✅ Used only on the backend
- ✅ Your API secret never exposed to frontend

## 🐛 Troubleshooting

**Issue:** Upload returns 401 error
- **Solution:** Check `.env` file has correct credentials

**Issue:** File format not supported
- **Solution:** Use MP3, WAV, FLAC, or OGG format

**Issue:** File too large
- **Solution:** Limit is 100MB per upload (easily increased)

**Issue:** Cloudinary not configured
- **Solution:** Make sure `.env` is loaded
- Check: `GET /api/test/cloudinary`

## 📝 Next Steps

1. ✅ **Test the endpoints** using `/upload-test.html`
2. ✅ **Upload a sample song** and verify it plays
3. ✅ **Deploy to Railway** - environment variables already set
4. 🔄 **Add upload UI to main app** (index.html)
5. 🔄 **Integrate SoundCloud search** (requires SOUNDCLOUD_CLIENT_ID)

## ℹ️ Note

The upload endpoint automatically:
- Creates a Cloudinary folder `spider-music` for organization
- Extracts audio duration
- Stores metadata in MongoDB
- Makes audio playable immediately
- Optimizes quality automatically

Enjoy! 🎉
