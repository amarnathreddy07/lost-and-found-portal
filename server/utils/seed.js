const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const { departmentFromEmail } = require('../config/accounts');
const User = require('../models/User');

function nameFromEmail(email) {
  const raw = String(email).split('@')[0].split('.')[0].replace(/[^A-Za-z0-9]+/g, ' ').trim();
  return raw ? raw.replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 80) : 'Campus Admin';
}

async function seedDatabase({ allowAdmin = Boolean(process.env.ADMIN_PASSWORD) } = {}) {
  const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!allowAdmin || !email || !process.env.ADMIN_PASSWORD) return { users: 0 };

  const existing = await User.findOne({ email });
  if (existing) {
    const department = departmentFromEmail(email);
    if (existing.department !== department) {
      existing.department = department;
      await existing.save();
    }
    return { users: 1 };
  }

  await User.create({
    name: nameFromEmail(email),
    email,
    department: departmentFromEmail(email),
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: 'admin'
  });

  return { users: 1 };
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sai-university-lost-found');
      const summary = await seedDatabase();
      console.log('[seed] Complete:', summary);
    } catch (error) {
      console.error('[seed] Failed:', error.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { seedDatabase };
