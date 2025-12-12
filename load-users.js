#!/usr/bin/env node
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

async function loadUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Read users.json
    const usersPath = path.join(__dirname, 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    
    console.log(`\n📊 Users to load: ${usersData.length}`);
    usersData.forEach(u => console.log(`  ✓ ${u.username} (${u.role || 'user'})`));

    // Clear existing users
    const deleted = await User.deleteMany({});
    console.log(`\n🗑️  Deleted ${deleted.deletedCount} existing users`);

    // Insert new users
    const inserted = await User.insertMany(usersData);
    console.log(`\n✅ Inserted ${inserted.length} users into MongoDB`);

    // Verify
    const finalCount = await User.countDocuments();
    console.log(`📊 Final user count: ${finalCount}`);

    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

loadUsers();
