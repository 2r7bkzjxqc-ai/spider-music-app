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

async function cleanAndFixUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Delete user without role (test user)
    console.log('\n🗑️  Deleting users without proper roles...');
    const deleted = await User.deleteMany({ role: { $in: [null, undefined, ''] } });
    console.log(`  Deleted: ${deleted.deletedCount} users`);

    // Define correct roles
    const roleMap = {
      'Louka': 'superadmin',
      'cacaquipuelecaca': 'user',
      'Artox': 'user',
      'sorayagiov': 'user',
      'zboobland': 'user'
    };

    console.log('\n🔧 Setting correct roles...');
    
    for (const [username, role] of Object.entries(roleMap)) {
      const result = await User.findOneAndUpdate(
        { username },
        { $set: { role } },
        { new: true }
      );
      
      if (result) {
        console.log(`  ✓ ${username} → ${role}`);
      } else {
        console.log(`  ⚠️ ${username} not found, creating...`);
        const newUser = new User({
          username,
          password: username === 'Louka' ? 'Ceta2007' : 'password',
          role,
          avatar: 'https://via.placeholder.com/150',
          isOnline: false,
          following: [],
          followers: [],
          likedAlbums: []
        });
        await newUser.save();
        console.log(`  ✓ Created ${username} with role ${role}`);
      }
    }

    // Verify
    const users = await User.find().select('username role');
    console.log('\n📊 Final user list:');
    users.forEach(u => console.log(`  ${u.username}: ${u.role}`));

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanAndFixUsers();
