#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config();

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  avatar: String,
  isOnline: Boolean,
  following: [String],
  followers: [String],
  likedAlbums: [String]
});

const User = mongoose.model('User', userSchema);

async function fixRoles() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Define roles
    const roleMap = {
      'Louka': 'superadmin',
      'cacaquipuelecaca': 'user',
      'Artox': 'user',
      'sorayagiov': 'user',
      'zboobland': 'user'
    };

    console.log('\n🔧 Updating user roles...');
    
    for (const [username, role] of Object.entries(roleMap)) {
      const result = await User.findOneAndUpdate(
        { username },
        { role },
        { new: true }
      );
      
      if (result) {
        console.log(`  ✓ ${username} → ${role}`);
      } else {
        console.log(`  ⚠️ ${username} not found`);
      }
    }

    // Verify
    const users = await User.find().select('username role');
    console.log('\n📊 Updated users:');
    users.forEach(u => console.log(`  ${u.username}: ${u.role}`));

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixRoles();
