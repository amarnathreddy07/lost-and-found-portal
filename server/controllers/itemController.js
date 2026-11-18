const fs = require('fs');
const path = require('path');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { uploadDir } = require('../config/upload');
const { normalizeImageUrl } = require('../utils/imageUrl');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function locationLabel(location) {
  const room = /^AB\d-(\d{3})$/.exec(location);
  if (room) return `ROOM ${room[1]}`;
  const blockPlace = /^AB\d - (.+)$/.exec(location);
  if (blockPlace) return blockPlace[1].toUpperCase();
  if (location === 'AB1 BACKSIDE') return 'BACKSIDE';
  if (location === 'AB1 RECEPTION') return 'RECEPTION';
  if (location.startsWith('STUDENT LOUNGE')) return 'STUDENT LOUNGE (OPP. REGISTRY)';
  return location.toUpperCase();
}

function searchTermsForQuery(q) {
  const needle = String(q).trim().toLowerCase();
  if (!needle) return [];

  const terms = [q];
  Item.LOCATIONS.forEach((location) => {
    if (`${location} ${locationLabel(location)}`.toLowerCase().includes(needle)) terms.push(location);
  });
  return [...new Set(terms)];
}

const sortOptions = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  date_desc: { date: -1 },
  date_asc: { date: 1 },
  title_asc: { title: 1 }
};

function imageUrlFor(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  return normalizeImageUrl(req.body.driveLink || req.body.imageUrl);
}

async function deleteUploadedFile(url) {
  if (url && url.startsWith('/uploads/')) {
    await fs.promises.unlink(path.join(uploadDir, path.basename(url))).catch(() => {});
  }
}

exports.list = asyncHandler(async (req, res) => {
  const { q, type, category, location, status, sort = 'newest' } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 60);
  const filter = {};

  if (q) {
    const pattern = new RegExp(searchTermsForQuery(q).map(escapeRegex).join('|'), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { location: pattern }, { category: pattern }];
  }
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (status) filter.status = status;
  else filter.status = { $ne: 'archived' };

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reportedBy', 'name')
      .lean(),
    Item.countDocuments(filter)
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await Item.find({ reportedBy: req.user.id }).sort({ createdAt: -1 }).populate('reportedBy', 'name').lean();
  res.json({ success: true, items });
});

exports.getById = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate('reportedBy', 'name').lean();
  if (!item) throw new ApiError(404, 'Item not found.');
  res.json({ success: true, item });
});

exports.create = asyncHandler(async (req, res) => {
  const { title, type, category, description, location, date } = req.body;
  const item = await Item.create({
    title,
    type,
    category,
    description,
    location,
    date: new Date(date),
    imageUrl: imageUrlFor(req),
    reportedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Your item has been posted to the campus board.',
    item
  });
});

exports.update = asyncHandler(async (req, res) => {
  const fields = ['title', 'type', 'category', 'description', 'location', 'date', 'imageUrl'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  const existing = await Item.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Item not found.');

  if (req.file) {
    if (existing.imageUrl && existing.imageUrl !== `/uploads/${req.file.filename}`) {
      await deleteUploadedFile(existing.imageUrl);
    }
    updates.imageUrl = `/uploads/${req.file.filename}`;
  }
  if (updates.date) updates.date = new Date(updates.date);

  const item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  res.json({ success: true, message: 'Listing updated.', item });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found.');

  await Claim.deleteMany({ item: item._id });
  await deleteUploadedFile(item.imageUrl);

  res.json({ success: true, message: 'Listing and its claims were deleted.' });
});

exports.setStatus = asyncHandler(async (req, res) => {
  if (req.body.status === 'active') {
    const approved = await Claim.exists({ item: req.params.id, status: 'approved' });
    if (approved) throw new ApiError(409, 'An approved claim exists. Resolve the item before reopening it.');
  }

  const item = await Item.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!item) throw new ApiError(404, 'Item not found.');
  res.json({ success: true, message: `Listing marked as ${item.status}.`, item });
});
