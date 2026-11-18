const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const { departmentFromEmail } = require('../config/accounts');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const SAMPLE_USERS = [
  { key: 'admin', name: 'Campus Admin', email: 'campusadmin.a-29@admin.saiuniversity.edu.in', role: 'admin', studentId: 'ADMIN-001', phone: '+91 90000 00001' },
  { key: 'arjun', name: 'Arjun Mehta', email: 'arjunmehta.a-21@scds.saiuniversity.edu.in', role: 'user', studentId: 'SAI-21CS-014', phone: '+91 90000 00002' },
  { key: 'meera', name: 'Meera Iyer', email: 'meeraiyer.m-22@ece.saiuniversity.edu.in', role: 'user', studentId: 'SAI-22EC-031', phone: '+91 90000 00003' },
  { key: 'kabir', name: 'Kabir Shah', email: 'kabirshah.k-20@me.saiuniversity.edu.in', role: 'user', studentId: 'SAI-20ME-008', phone: '+91 90000 00004' },
  { key: 'diya', name: 'Diya Nair', email: 'diyanair.d-23@llb.saiuniversity.edu.in', role: 'user', studentId: 'SAI-23LLB-045', phone: '+91 90000 00005' }
];

const SAMPLE_ITEMS = [
  {
    title: 'Black Sony WH-1000XM4 Headphones',
    type: 'lost',
    category: 'Electronics',
    description: 'Left my noise-cancelling headphones on the second-floor study table near the window. Black case included, with a small blue sticker on the left cup.',
    location: 'AB1 - LIBRARY',
    days: 1
  },
  {
    title: 'Blue Steel Water Bottle',
    type: 'found',
    category: 'Accessories',
    description: 'Found a blue steel bottle with a “SAI RUNS 10K” sticker near the student lounge counter. Clean and full of water.',
    location: 'STUDENT LOUNGE - OPP. STUDENT REGISTRY',
    days: 2
  },
  {
    title: 'Engineering Mathematics Textbook',
    type: 'lost',
    category: 'Books & Notes',
    description: 'Misplaced my first-semester Engineering Mathematics volume after the tutorial. My name is written inside the front cover in blue ink.',
    location: 'AB1-101',
    days: 3
  },
  {
    title: 'Student ID Card — Ananya Rao',
    type: 'found',
    category: 'ID & Cards',
    description: 'Turned in a student ID card found near the reception desk. Card appears to belong to a first-year student.',
    location: 'RECEPTION',
    days: 1
  },
  {
    title: 'Navy Blue Hoodie with SAI Print',
    type: 'lost',
    category: 'Clothing',
    description: 'Lost a navy hoodie with a big cream “SAI UNIVERSITY” print on the back after evening practice at the sports complex.',
    location: 'SPORTS COMPLEX',
    days: 4
  },
  {
    title: 'Bunch of Keys with Red Ribbon',
    type: 'found',
    category: 'Keys',
    description: 'Found a set of four keys tied to a red ribbon near the parking area. One key has a small brass tag.',
    location: 'PARKING AREA',
    days: 2
  },
  {
    title: 'Grey Jansport Backpack',
    type: 'lost',
    category: 'Bags',
    description: 'My grey backpack went missing after a group study session in the library. Contains chargers, a planner and a silver pen drive.',
    location: 'AB2 - LIBRARY',
    days: 5
  },
  {
    title: 'Red Nike Running Shoes (Size 8)',
    type: 'found',
    category: 'Clothing',
    description: 'A pair of red running shoes left behind near the running track after the morning athletics session. Size 8, slightly worn but clean.',
    location: 'RUNNING TRACK',
    days: 3
  },
  {
    title: 'Texas Instruments Scientific Calculator',
    type: 'lost',
    category: 'Electronics',
    description: 'Lost an off-white TI calculator during an internal exam in the computer lab. It has a black protective cover and a small crack on the corner.',
    location: 'COMPUTER LAB',
    days: 6
  },
  {
    title: 'Black Umbrella with Wooden Handle',
    type: 'found',
    category: 'Accessories',
    description: 'Found beside room 207 after yesterday’s rain. Large black umbrella with a wooden handle and a small chip on the tip.',
    location: 'BESIDE 207',
    days: 1
  }
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

  let reporter = userMap.arjun || await User.findOne({ role: 'user' });
  if (!reporter) {
    reporter = await User.create({
      name: 'Campus Seed Account',
      email: `seed${crypto.randomBytes(6).toString('hex')}.s-29@scds.saiuniversity.edu.in`,
      password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12),
      role: 'user',
      department: 'SCDS'
    });
  }

  let inserted = 0;
  for (const sample of SAMPLE_ITEMS) {
    const existing = await Item.findOne({ title: sample.title });
    if (existing) {
      if (existing.location !== sample.location) {
        existing.location = sample.location;
        await existing.save();
      }
      continue;
    }
    await Item.create({
      title: sample.title,
      type: sample.type,
      category: sample.category,
      description: sample.description,
      location: sample.location,
      date: daysAgo(sample.days),
      reportedBy: reporter._id,
      imageUrl: ''
    });
    inserted += 1;
  }

  const item = async (title) => Item.findOne({ title });
  const summary = {
    users: Object.keys(userMap).length,
    itemsInserted: inserted,
    items: await Item.countDocuments(),
    claims: await Claim.countDocuments()
  };

  if ((await Claim.countDocuments()) > 0) return summary;

  const first = await item(SAMPLE_ITEMS[0].title);
  const third = await item(SAMPLE_ITEMS[2].title);
  const fifth = await item(SAMPLE_ITEMS[4].title);
  const sixth = await item(SAMPLE_ITEMS[5].title);
  const { meera, kabir, diya } = userMap;

  const specs = [
    first && meera && {
      item: first._id,
      claimant: meera._id,
      proof: 'The blue sticker on the left cup and the black zip case match the pair I lost in the library.'
    },
    third && kabir && {
      item: third._id,
      claimant: kabir._id,
      proof: 'My name is written on the first page in blue ink and I remember the torn corner on page 40.',
      status: 'approved',
      reviewedAt: daysAgo(1),
      reviewedBy: reporter._id
    },
    fifth && meera && {
      item: fifth._id,
      claimant: meera._id,
      proof: 'I was wearing this hoodie at practice, but I am not fully sure about the print on the back.',
      status: 'rejected',
      reviewedAt: daysAgo(2),
      reviewedBy: reporter._id
    },
    sixth && diya && {
      item: sixth._id,
      claimant: diya._id,
      proof: 'One of the keys opens my hostel locker and the brass tag has my room number engraved on it.'
    }
  ].filter(Boolean);

  if (specs.length) {
    await Claim.insertMany(specs);
    if (third && kabir) await Item.findByIdAndUpdate(third._id, { status: 'claimed' });
    if (fifth && meera) await Item.findByIdAndUpdate(fifth._id, { status: 'resolved' });
    summary.claims = specs.length;
  }

  return summary;
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

module.exports = { seedDatabase, SAMPLE_ITEMS, SAMPLE_USERS };
