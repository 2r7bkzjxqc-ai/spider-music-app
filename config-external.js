/**
 * External Services Configuration
 * Cloudinary & SoundCloud integration
 */

module.exports = {
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
    apiKey: process.env.CLOUDINARY_API_KEY || 'your-api-key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'spider_music',
    folder: 'spider-music/audio'
  },

  // SoundCloud Configuration
  soundcloud: {
    clientId: process.env.SOUNDCLOUD_CLIENT_ID || 'gqKBMSuBw5rbN9rDRYPqKNvF17ovlObu',
    apiUrl: 'https://api.soundcloud.com'
  }
};
