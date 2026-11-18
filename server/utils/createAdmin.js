const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const User = require('../models/User');

async function createAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]-\d{2}@[A-Za-z]+(?:-[A-Za-z]+)*\.saiuniversity\.edu\.in$/.test(email)) {
    throw new Error('ADMIN_EMAIL must use name.initial-YY@department.saiuniversity.edu.in.');
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters with a letter and a number.');
  }

  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sai-university-lost-found');
  const admin = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: 'Campus Admin',
        role: 'admin',
        password: await bcrypt.hash(password, 12)
      },
      $inc: { tokenVersion: 1 }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  console.log(`[admin] Provisioned ${admin.email} (role: ${admin.role}).`);
}

if (require.main === module) {
  createAdmin()
    .catch((error) => {
      console.error('[admin] Failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { createAdmin };
