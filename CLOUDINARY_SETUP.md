# Cloudinary Setup Guide

## Overview
Cloudinary is a cloud-based media management platform. We use it to host audio files for the Spider Music app.

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Click **Sign Up** (Free tier is available)
3. Choose your cloud name (e.g., `spidermusic`)
4. Complete the registration

## Step 2: Get Your API Credentials

1. Go to your **Dashboard** after logging in
2. You'll see your **Cloud Name** at the top
3. Scroll down to find the **API Key** and **API Secret**
4. Copy these values

## Step 3: Create Upload Preset

1. In the Cloudinary dashboard, go to **Settings** > **Upload**
2. Scroll to **Upload presets**
3. Click **Add upload preset**
4. Give it a name: `spider_audio`
5. Set **Signing Mode** to `Unsigned`
6. Set **Allowed formats** to include `mp3`, `wav`, `mpeg`
7. Click **Save**

## Step 4: Configure Environment Variables

### For Local Development
Create a `.env` file in the project root:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=spider_audio
```

### For Railway (Production)
1. Go to your Railway project: `spidermusic.up.railway.app`
2. Click **Settings**
3. Go to **Environment Variables**
4. Add each variable:
   - `CLOUDINARY_CLOUD_NAME`: Your cloud name
   - `CLOUDINARY_API_KEY`: Your API key
   - `CLOUDINARY_API_SECRET`: Your API secret
   - `CLOUDINARY_UPLOAD_PRESET`: `spider_audio`
5. Click **Save**

## Step 5: Test the Integration

The following endpoints are now available:

### Upload Audio
```bash
POST /api/songs/upload-cloudinary
Content-Type: application/json

{
  "title": "Song Title",
  "artist": "Artist Name",
  "cover": "https://example.com/cover.jpg",
  "cloudinaryUrl": "https://res.cloudinary.com/.../song.mp3",
  "duration": 180
}
```

### Search SoundCloud
```bash
GET /api/soundcloud/search?q=Dua%20Lipa&limit=20
```

### Get Songs by Platform
```bash
GET /api/songs/platform/cloudinary
GET /api/songs/platform/soundcloud
GET /api/songs/platform/local
```

## Troubleshooting

**Issue**: Upload returns 401 error
- **Solution**: Check that API Key and Secret are correct
- **Verify**: Test credentials in Cloudinary dashboard

**Issue**: Upload preset not found
- **Solution**: Make sure upload preset is created and spelled correctly
- **Verify**: Go to Settings > Upload in Cloudinary dashboard

**Issue**: Audio doesn't play
- **Solution**: Verify the cloudinaryUrl is accessible
- **Check**: Open the URL in browser - it should start playing

## Example Usage in Frontend

```javascript
// Upload file to Cloudinary
const formData = new FormData();
formData.append('file', audioFile);
formData.append('upload_preset', 'spider_audio');

const cloudinaryResponse = await fetch(
  'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/auto/upload',
  { method: 'POST', body: formData }
);

const cloudinaryData = await cloudinaryResponse.json();
const cloudinaryUrl = cloudinaryData.secure_url;

// Save to database
const response = await fetch('/api/songs/upload-cloudinary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Song Name',
    artist: 'Artist Name',
    cloudinaryUrl: cloudinaryUrl,
    duration: 180
  })
});
```

## Free Tier Limits
- 25 GB monthly uploads
- Unlimited transformations
- Up to 10 GB storage
- Perfect for our use case!

## Next Steps
1. Create Cloudinary account
2. Get API credentials
3. Create upload preset
4. Add environment variables to Railway
5. Test the endpoints
