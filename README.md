# Spider Music 🎵

A beautiful music streaming web app built with Node.js, Express, MongoDB, and Supabase Storage.

## Features

- 🎵 Stream music from SoundCloud
- 👤 User authentication with roles (admin, superadmin, user)
- 📤 Upload audio files to Supabase Storage
- 🎨 Beautiful dark theme UI with Tailwind CSS
- 🔍 Search songs, artists, and playlists
- ❤️ Like songs and manage playlists
- 👥 Follow other users
- 🎙️ Artist profiles

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Storage**: Supabase Storage
- **Frontend**: HTML5 + Tailwind CSS
- **Deployment**: Railway

## Setup

```bash
npm install
node server.js
```

## Environment Variables

Required in `.env`:
- `MONGODB_URI` - MongoDB connection string
- `ENCRYPTION_KEY` - For data encryption
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SECRET_KEY` - Supabase API key
- `SUPABASE_BUCKET_NAME` - Supabase storage bucket name

## Login

Default admin account:
- Username: `Louka`
- Password: `Ceta2007`

## Scripts

- `node server.js` - Start the server
- `node load-users.js` - Load users from users.json to MongoDB
- `node fix-roles.js` - Update user roles in MongoDB
