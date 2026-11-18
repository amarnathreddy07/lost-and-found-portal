const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const { departmentFromEmail } = require('../config/accounts');
const User = require('../models/User');

const SAMPLE_USERS = [
  { key: 'admin', name: 'Campus Admin', email: 'campusadmin.a-29@admin.saiuniversity.edu.in', role: 'admin', studentId: 'ADMIN-001', phone: '+91 90000 00001' },
  { key: 'arjun', name: 'Arjun Mehta', email: 'arjunmehta.a-21@scds.saiuniversity.edu.in', role: 'user', studentId: 'SAI-21CS-014', phone: '+91 90000 00002' },
  { key: 'meera', name: 'Meera Iyer', email: 'meeraiyer.m-22@ece.saiuniversity.edu.in', role: 'user', studentId: 'SAI-22EC-031', phone: '+91 90000 00003' },
  { key: 'kabir', name: 'Kabir Shah', email: 'kabirshah.k-20@me.saiuniversity.edu.in', role: 'user', studentId: 'SAI-20ME-008', phone: '+91 90000 00004' },
  { key: 'diya', name: 'Diya Nair', email: 'diyanair.d-23@llb.saiuniversity.edu.in', role: 'user', studentId: 'SAI-23LLB-045', phone: '+91 90000 00005' }
];

function passwordFor(user, allowAdmin) {
  if (user.role === 'admin') {
    return allowAdmin ? (process.env.ADMIN_PASSWORD || '') : '';
  }
  return process.env.SEED_STUDENT_PASSWORD || crypto.randomBytes(18).toString('hex');
}

async function seedDatabase({ allowAdmin = process.env.NODE_ENV !== 'production' } = {}) {
  const userMap = {};

  for (const profile of SAMPLE_USERS) {
    if (profile.role === 'admin' && !allowAdmin) continue;

    const email = profile.role === 'admin'
      ? (process.env.ADMIN_EMAIL || profile.email).toLowerCase().trim()
      : profile.email;
    const password = passwordFor(profile, allowAdmin);

    let record = await User.findOne({ email });
    if (!record) {
      if (!password) continue;
      const { key, ...fields } = profile;
      record = await User.create({
        ...fields,
        email,
        department: departmentFromEmail(email),
        password: await bcrypt.hash(password, 12)
      });
    } else if (record.department !== departmentFromEmail(email)) {
      record.department = departmentFromEmail(email);
      await record.save();
    }
    userMap[profile.key] = record;
  }

  return { users: Object.keys(userMap).length };
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

module.exports = { seedDatabase, SAMPLE_USERS };
