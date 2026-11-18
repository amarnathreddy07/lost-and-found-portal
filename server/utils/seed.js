const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const SAMPLE_USERS = [
  { name: 'Campus Admin', email: 'admin@saiuniversity.edu', password: 'Admin@12345', role: 'admin', studentId: 'ADMIN-001', phone: '+91 90000 00001' },
  { name: 'Arjun Mehta', email: 'arjun@saiuniversity.edu', password: 'Student@123', role: 'user', studentId: 'SAI-21CS-014', phone: '+91 90000 00002' },
  { name: 'Meera Iyer', email: 'meera@saiuniversity.edu', password: 'Student@123', role: 'user', studentId: 'SAI-22EC-031', phone: '+91 90000 00003' },
  { name: 'Kabir Shah', email: 'kabir@saiuniversity.edu', password: 'Student@123', role: 'user', studentId: 'SAI-20ME-008', phone: '+91 90000 00004' },
  { name: 'Diya Nair', email: 'diya@saiuniversity.edu', password: 'Student@123', role: 'user', studentId: 'SAI-23LLB-045', phone: '+91 90000 00005' }
];

const SAMPLE_ITEMS = [
  {
    title: 'Black Sony WH-1000XM4 Headphones',
    type: 'lost',
    category: 'Electronics',
    description: 'Left my noise-cancelling headphones on the second-floor study table near the window. Black case included, with a small blue sticker on the left cup.',
    location: 'Main Library',
    days: 1,
    reporter: 'arjun@saiuniversity.edu'
  },
  {
    title: 'Blue Steel Water Bottle',
    type: 'found',
    category: 'Accessories',
    description: 'Found a blue steel bottle with a “SAI RUNS 10K” sticker beside the canteen entrance. Clean and full of water.',
    location: 'Cafeteria',
    days: 2,
    reporter: 'meera@saiuniversity.edu'
  },
  {
    title: 'Engineering Mathematics Textbook',
    type: 'lost',
    category: 'Books & Notes',
    description: 'Misplaced my first-semester Engineering Mathematics volume after the tutorial. My name is written inside the front cover in blue ink.',
    location: 'Lecture Hall 101',
    days: 3,
    reporter: 'arjun@saiuniversity.edu'
  },
  {
    title: 'Student ID Card — Ananya Rao',
    type: 'found',
    category: 'ID & Cards',
    description: 'Turned in a student ID card found near the admin block gate. Card appears to belong to a first-year student.',
    location: 'Admin Block',
    days: 1,
    reporter: 'meera@saiuniversity.edu'
  },
  {
    title: 'Navy Blue Hoodie with SAI Print',
    type: 'lost',
    category: 'Clothing',
    description: 'Lost a navy hoodie with a big cream “SAI UNIVERSITY” print on the back after evening basketball practice.',
    location: 'Sports Ground',
    days: 4,
    reporter: 'arjun@saiuniversity.edu'
  },
  {
    title: 'Bunch of Keys with Red Ribbon',
    type: 'found',
    category: 'Keys',
    description: 'Found a set of four keys tied to a red ribbon in the hostel A common room. One key has a small brass tag.',
    location: 'Student Hostel A',
    days: 2,
    reporter: 'meera@saiuniversity.edu'
  },
  {
    title: 'Grey Jansport Backpack',
    type: 'lost',
    category: 'Bags',
    description: 'My grey backpack went missing after a group study session. Contains chargers, a planner and a silver pen drive.',
    location: 'Central Courtyard',
    days: 5,
    reporter: 'arjun@saiuniversity.edu'
  },
  {
    title: 'Red Nike Running Shoes (Size 8)',
    type: 'found',
    category: 'Clothing',
    description: 'A pair of red running shoes left behind after the morning athletics session. Size 8, slightly worn but clean.',
    location: 'Sports Ground',
    days: 3,
    reporter: 'meera@saiuniversity.edu'
  },
  {
    title: 'Texas Instruments Scientific Calculator',
    type: 'lost',
    category: 'Electronics',
    description: 'Lost an off-white TI calculator during the internal exam. It has a black protective cover and a small crack on the corner.',
    location: 'Engineering Block',
    days: 6,
    reporter: 'arjun@saiuniversity.edu'
  },
  {
    title: 'Black Umbrella with Wooden Handle',
    type: 'found',
    category: 'Accessories',
    description: 'Found near the parking lot after yesterday’s rain. Large black umbrella with a wooden handle and a small chip on the tip.',
    location: 'Parking Lot',
    days: 1,
    reporter: 'meera@saiuniversity.edu'
  }
];

async function seedDatabase() {
  const passwordHash = await bcrypt.hash('Student@123', 10);
  const adminHash = await bcrypt.hash('Admin@12345', 10);

  const userMap = {};
  for (const user of SAMPLE_USERS) {
    const existing = await User.findOne({ email: user.email });
    const record = existing || await User.create({
      ...user,
      name: user.name.trim(),
      password: user.role === 'admin' ? adminHash : passwordHash
    });
    userMap[user.email] = record;
  }

  if ((await Item.countDocuments()) === 0) {
    for (const item of SAMPLE_ITEMS) {
      await Item.create({
        title: item.title,
        type: item.type,
        category: item.category,
        description: item.description,
        location: item.location,
        date: daysAgo(item.days),
        reportedBy: userMap[item.reporter]._id,
        imageUrl: ''
      });
    }
    console.log(`[seed] Inserted ${SAMPLE_ITEMS.length} sample campus items.`);
  } else {
    console.log('[seed] Items already present; skipped item seeding.');
  }

  if ((await Claim.countDocuments()) === 0) {
    const first = await Item.findOne({ title: SAMPLE_ITEMS[0].title });
    const third = await Item.findOne({ title: SAMPLE_ITEMS[2].title });
    const fifth = await Item.findOne({ title: SAMPLE_ITEMS[4].title });
    const sixth = await Item.findOne({ title: SAMPLE_ITEMS[5].title });

    await Claim.create([
      {
        item: first._id,
        claimant: userMap['meera@saiuniversity.edu']._id,
        proof: 'The blue sticker on the left cup and the black zip case match the pair I lost in the library.'
      },
      {
        item: third._id,
        claimant: userMap['kabir@saiuniversity.edu']._id,
        proof: 'My name is written on the first page in blue ink and I remember the torn corner on page 40.',
        status: 'approved',
        reviewedAt: daysAgo(1),
        reviewedBy: userMap['arjun@saiuniversity.edu']._id
      },
      {
        item: fifth._id,
        claimant: userMap['meera@saiuniversity.edu']._id,
        proof: 'I was wearing this hoodie at practice, but I am not fully sure about the print on the back.',
        status: 'rejected',
        reviewedAt: daysAgo(2),
        reviewedBy: userMap['arjun@saiuniversity.edu']._id
      },
      {
        item: sixth._id,
        claimant: userMap['diya@saiuniversity.edu']._id,
        proof: 'One of the keys opens my hostel locker and the brass tag has my room number engraved on it.'
      }
    ]);

    await Item.findByIdAndUpdate(third._id, { status: 'claimed' });
    await Item.findByIdAndUpdate(fifth._id, { status: 'resolved' });
    console.log('[seed] Inserted 4 sample claims.');
  }

  return { users: Object.keys(userMap).length, items: await Item.countDocuments(), claims: await Claim.countDocuments() };
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
