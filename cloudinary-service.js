/**
 * Upload Song to Cloudinary
 * Stores audio files in cloud storage
 */

const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const config = require('./config-external');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

/**
 * Upload audio file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} filename - File name for cloud storage
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadAudioToCloudinary(filePath, filename) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: config.cloudinary.folder,
      public_id: filename.replace(/\.[^/.]+$/, ''),
      quality: 'auto',
      fetch_format: 'auto',
      timeout: 120000
    });

    return result.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary upload failed:', err.message);
    throw err;
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (err) {
    console.error('❌ Cloudinary delete failed:', err.message);
    throw err;
  }
}

module.exports = {
  uploadAudioToCloudinary,
  deleteFromCloudinary,
  cloudinary
};
