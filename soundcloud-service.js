/**
 * SoundCloud Integration Service
 * Fetch and sync songs from SoundCloud
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('./config-external');

const SC_API = config.soundcloud.apiUrl;
const SC_CLIENT_ID = config.soundcloud.clientId;

/**
 * Search for tracks on SoundCloud
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} - Array of tracks
 */
async function searchSoundCloudTracks(query, limit = 20) {
  try {
    const url = `${SC_API}/tracks?q=${encodeURIComponent(query)}&client_id=${SC_CLIENT_ID}&limit=${limit}`;
    const response = await fetch(url);
    const tracks = await response.json();

    return tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user.username,
      cover: track.artwork_url || 'https://via.placeholder.com/300/121212/FFFFFF?text=No+Cover',
      src: track.stream_url ? `${track.stream_url}?client_id=${SC_CLIENT_ID}` : null,
      duration: track.duration,
      platform: 'soundcloud',
      externalId: track.id,
      externalUrl: track.permalink_url,
      likes: [],
      createdAt: new Date(track.created_at)
    })).filter(t => t.src); // Only return tracks with valid stream URL
  } catch (err) {
    console.error('❌ SoundCloud search failed:', err.message);
    return [];
  }
}

/**
 * Get track details from SoundCloud
 * @param {string} trackId - SoundCloud track ID
 * @returns {Promise<Object>} - Track details
 */
async function getSoundCloudTrack(trackId) {
  try {
    const url = `${SC_API}/tracks/${trackId}?client_id=${SC_CLIENT_ID}`;
    const response = await fetch(url);
    const track = await response.json();

    return {
      id: track.id,
      title: track.title,
      artist: track.user.username,
      cover: track.artwork_url || 'https://via.placeholder.com/300/121212/FFFFFF?text=No+Cover',
      src: track.stream_url ? `${track.stream_url}?client_id=${SC_CLIENT_ID}` : null,
      duration: track.duration,
      platform: 'soundcloud',
      externalId: track.id,
      externalUrl: track.permalink_url,
      likes: [],
      createdAt: new Date(track.created_at)
    };
  } catch (err) {
    console.error('❌ SoundCloud fetch failed:', err.message);
    return null;
  }
}

/**
 * Get popular tracks from a user on SoundCloud
 * @param {string} username - SoundCloud username
 * @param {number} limit - Number of tracks
 * @returns {Promise<Array>} - Array of user's tracks
 */
async function getSoundCloudUserTracks(username, limit = 20) {
  try {
    // First, get user ID by username
    const userUrl = `${SC_API}/users?q=${encodeURIComponent(username)}&client_id=${SC_CLIENT_ID}&limit=1`;
    const userResponse = await fetch(userUrl);
    const users = await userResponse.json();

    if (!users.length) return [];

    const userId = users[0].id;

    // Then get user's tracks
    const tracksUrl = `${SC_API}/users/${userId}/tracks?client_id=${SC_CLIENT_ID}&limit=${limit}&sort=hotness`;
    const tracksResponse = await fetch(tracksUrl);
    const tracks = await tracksResponse.json();

    return tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user.username,
      cover: track.artwork_url || 'https://via.placeholder.com/300/121212/FFFFFF?text=No+Cover',
      src: track.stream_url ? `${track.stream_url}?client_id=${SC_CLIENT_ID}` : null,
      duration: track.duration,
      platform: 'soundcloud',
      externalId: track.id,
      externalUrl: track.permalink_url,
      likes: [],
      createdAt: new Date(track.created_at)
    })).filter(t => t.src);
  } catch (err) {
    console.error('❌ SoundCloud user tracks fetch failed:', err.message);
    return [];
  }
}

module.exports = {
  searchSoundCloudTracks,
  getSoundCloudTrack,
  getSoundCloudUserTracks
};
