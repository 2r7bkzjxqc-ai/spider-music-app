# Spider Music 🎵

A beautiful music streaming web app to listen to and discover music. Built with Node.js, Express, MongoDB, and Supabase Storage.

## Features

- 🎵 Stream music from SoundCloud
- 👤 User authentication with roles (admin, superadmin, user)
- 📤 Upload your own audio files to Supabase Storage
- 🎨 Beautiful dark theme UI with Tailwind CSS
- 🔍 Search songs, artists, and playlists
- ❤️ Like songs and manage playlists
- 👥 Follow other users
- 🎙️ Artist profiles
- 🎛️ Full-featured music player

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

## Demo Login

Demo account available in the app. Check the application for login credentials.

⚠️ **Note**: Keep credentials secure and change password regularly.

## Scripts

- `node server.js` - Start the server
- `node load-users.js` - Load users from users.json to MongoDB
- `node fix-roles.js` - Update user roles in MongoDB

## License

MIT
