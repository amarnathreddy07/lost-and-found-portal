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
  'Main Library',
  'Student Hostel A',
  'Student Hostel B',
  'Engineering Block',
  'Admin Block',
  'Cafeteria',
  'Sports Ground',
  'Central Courtyard',
  'Lecture Hall 101',
  'Parking Lot',
  'Other'
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
