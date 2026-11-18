const mongoose = require('mongoose');

const TYPES = ['lost', 'found'];
const CATEGORIES = [
  'Electronics',
  'Books & Notes',
  'Clothing',
  'Accessories',
  'ID & Cards',
  'Keys',
  'Bags',
  'Sports',
  'Other'
];
const LOCATIONS = [
  'AB1-101', 'AB1-102', 'AB1-103', 'AB1-104', 'AB1-201',
  'COMPUTER LAB', 'AI LAB', 'BIOTECH LAB',
  'FACULTY ROOM 1', 'FACULTY ROOM 2', 'FACULTY ROOM 3', 'FACULTY ROOM 4', 'FACULTY ROOM 5',
  'MOOT COURT', 'AB1 - LIBRARY', 'AB1 BACKSIDE', 'AB1 RECEPTION',
  'AB2-101',
  'AB2-201', 'AB2-202', 'AB2-203', 'AB2-204', 'AB2-205',
  'AB2-206', 'AB2-207', 'AB2-208', 'AB2-209', 'AB2-210', 'AB2-211',
  'HOMELESS AREA', 'RECEPTION', 'CONFERENCE ROOM 1', 'CONFERENCE ROOM 2',
  'FACULTY CONFERENCE ROOM', 'DEAN CORRIDOR', 'BESIDE 207', 'AB2 - LIBRARY',
  'DRONE & UAV LAB', 'STUDENT LOUNGE - OPP. STUDENT REGISTRY', 'FACULTY LOUNGE',
  'MINI AUDITORIUM', 'DINING AREA', 'TUCK STORE', 'GYM',
  'RUNNING TRACK', 'PARKING AREA', 'BABA TEMPLE', 'SPORTS COMPLEX'
];
const STATUSES = ['active', 'claimed', 'resolved', 'archived'];

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    type: { type: String, required: true, enum: TYPES },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    location: { type: String, required: true, enum: LOCATIONS },
    date: { type: Date, required: true },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'active' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true }
);

itemSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });

module.exports = mongoose.model('Item', itemSchema);
module.exports.TYPES = TYPES;
module.exports.CATEGORIES = CATEGORIES;
module.exports.LOCATIONS = LOCATIONS;
module.exports.STATUSES = STATUSES;
