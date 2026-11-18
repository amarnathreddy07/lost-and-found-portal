const fs = require('fs');
const path = require('path');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { uploadDir } = require('../config/upload');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sortOptions = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  date_desc: { date: -1 },
  date_asc: { date: 1 },
  title_asc: { title: 1 }
};

function imageUrlFor(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  if (req.body.imageUrl) return String(req.body.imageUrl).trim();
  return '';
}

exports.list = asyncHandler(async (req, res) => {
  const { q, type, category, location, status, sort = 'newest' } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 60);
  const filter = {};

  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
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
      .populate('reportedBy', 'name studentId')
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
  const item = await Item.findById(req.params.id).populate('reportedBy', 'name studentId').lean();
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
  if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
  if (updates.date) updates.date = new Date(updates.date);

  const item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Item not found.');
  res.json({ success: true, message: 'Listing updated.', item });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found.');

  await Claim.deleteMany({ item: item._id });
  if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
    const filename = path.basename(item.imageUrl);
    await fs.promises.unlink(path.join(uploadDir, filename)).catch(() => {});
  }

  res.json({ success: true, message: 'Listing and its claims were deleted.' });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!item) throw new ApiError(404, 'Item not found.');
  res.json({ success: true, message: `Listing marked as ${item.status}.`, item });
});
