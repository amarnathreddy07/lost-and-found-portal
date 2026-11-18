const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { uploadDir } = require('../config/upload');
const { DEFAULT_USER_PASSWORD, UNIVERSITY_EMAIL_PATTERN, PRELOADED_USERS, departmentFromEmail } = require('../config/accounts');
const { parseUserCsv } = require('../utils/csv');

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

exports.stats = asyncHandler(async (_req, res) => {
  const [totalItems, activeLost, activeFound, claimedItems, resolvedItems, totalUsers, pendingClaims] =
    await Promise.all([
      Item.countDocuments({ status: { $ne: 'archived' } }),
      Item.countDocuments({ type: 'lost', status: 'active' }),
      Item.countDocuments({ type: 'found', status: 'active' }),
      Item.countDocuments({ status: 'claimed' }),
      Item.countDocuments({ status: 'resolved' }),
      User.countDocuments(),
      Claim.countDocuments({ status: 'pending' })
    ]);

  const completed = claimedItems + resolvedItems;
  res.json({
    success: true,
    stats: {
      totalItems,
      activeLost,
      activeFound,
      claimedItems,
      resolvedItems,
      totalUsers,
      pendingClaims,
      resolvedRate: totalItems ? Math.round((completed / totalItems) * 100) : 0
    }
  });
});

exports.items = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const items = await Item.find(filter)
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name email')
    .lean();
  res.json({ success: true, items });
});

exports.users = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
  res.json({ success: true, users });
});

exports.preloadedUsers = asyncHandler(async (_req, res) => {
  const emails = PRELOADED_USERS.map((entry) => entry.email);
  const existing = await User.find({ email: { $in: emails } }).select('email').lean();
  const existingByEmail = new Map(existing.map((user) => [user.email, user._id.toString()]));
  res.json({
    success: true,
    initialPassword: DEFAULT_USER_PASSWORD,
    users: PRELOADED_USERS.map((entry) => ({
      ...entry,
      department: departmentFromEmail(entry.email),
      created: existingByEmail.has(entry.email),
      accountId: existingByEmail.get(entry.email) || null
    }))
  });
});

exports.createUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!UNIVERSITY_EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'Use name.initial-YY@department.saiuniversity.edu.in.');
  }

  const studentId = String(req.body.studentId || '').trim();
  if (!studentId) throw new ApiError(400, 'PRN is required.');

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    name: String(req.body.name || '').trim().slice(0, 80) || nameFromEmail(email),
    email,
    studentId: studentId.slice(0, 30),
    department: String(req.body.department || '').trim().slice(0, 40) || departmentFromEmail(email),
    phone: String(req.body.phone || '').trim().slice(0, 20),
    password: await bcrypt.hash(DEFAULT_USER_PASSWORD, 12),
    role: 'user',
    mustChangePassword: true
  });

  res.status(201).json({
    success: true,
    message: `${user.name} can now sign in.`,
    initialPassword: DEFAULT_USER_PASSWORD,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      phone: user.phone,
      role: user.role,
      mustChangePassword: true
    }
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!UNIVERSITY_EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'Use name.initial-YY@department.saiuniversity.edu.in.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const duplicate = await User.findOne({ email });
  if (duplicate && duplicate._id.toString() !== user.id) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  user.name = String(req.body.name || '').trim().slice(0, 80);
  user.email = email;
  user.studentId = String(req.body.studentId || '').trim().slice(0, 30);
  user.department = String(req.body.department || '').trim().slice(0, 40) || departmentFromEmail(email);
  user.phone = String(req.body.phone || '').trim().slice(0, 20);
  await user.save();

  res.json({
    success: true,
    message: `${user.name}'s details updated.`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    }
  });
});

function nameFromEmail(email) {
  const raw = email.split('@')[0].split('.')[0].replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!raw) return 'Campus User';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 80);
}

exports.importUsers = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Upload a CSV file.');

  const { records, structureError } = parseUserCsv(req.file.buffer.toString('utf8'));
  if (structureError) throw new ApiError(400, structureError);
  if (!records.length) throw new ApiError(400, 'The CSV file has no user rows.');

  const created = [];
  const skipped = [];
  const errors = [];
  const seen = new Set();

  for (const record of records) {
    const email = record.email.toLowerCase().trim();
    const row = record.row;

    if (!UNIVERSITY_EMAIL_PATTERN.test(email)) {
      errors.push({ row, email, message: 'Use name.initial-YY@department.saiuniversity.edu.in.' });
      continue;
    }
    if (seen.has(email)) {
      errors.push({ row, email, message: 'Duplicate email in this CSV.' });
      continue;
    }
    seen.add(email);

    const existing = await User.findOne({ email });
    if (existing) {
      skipped.push({ row, email, message: 'Account already exists.' });
      continue;
    }

    const password = record.password || DEFAULT_USER_PASSWORD;
    if (!PASSWORD_PATTERN.test(password)) {
      errors.push({ row, email, message: 'Password must be at least 8 characters with a letter and a number.' });
      continue;
    }

    const user = await User.create({
      name: (record.name || nameFromEmail(email)).slice(0, 80),
      email,
      studentId: record.studentId.slice(0, 30),
      department: departmentFromEmail(email),
      password: await bcrypt.hash(password, 12),
      role: 'user',
      mustChangePassword: true
    });

    created.push({ row, id: user._id.toString(), name: user.name, email: user.email, department: user.department, prn: user.studentId });
  }

  res.json({
    success: true,
    message: `Imported ${created.length} user${created.length === 1 ? '' : 's'}.`,
    created,
    skipped,
    errors,
    initialPassword: DEFAULT_USER_PASSWORD
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const supplied = String(req.body.password || '').trim();
  const temporaryPassword = supplied || `Sai-${crypto.randomBytes(5).toString('hex')}-A1`;

  user.password = await bcrypt.hash(temporaryPassword, 12);
  user.mustChangePassword = true;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ success: true, message: `Temporary password set for ${user.name}.`, temporaryPassword });
});

exports.updateRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own role.');
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { role: req.body.role }, $inc: { tokenVersion: 1 } },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, message: `${user.name} is now a ${user.role}.`, user });
});

exports.removeUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account.');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const items = await Item.find({ reportedBy: user._id }).select('imageUrl').lean();
  const itemIds = items.map((item) => item._id);
  await Claim.deleteMany({ $or: [{ item: { $in: itemIds } }, { claimant: user._id }] });
  await Item.deleteMany({ reportedBy: user._id });

  for (const item of items) {
    if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
      await fs.promises.unlink(path.join(uploadDir, path.basename(item.imageUrl))).catch(() => {});
    }
  }

  res.json({ success: true, message: 'User and related records deleted.' });
});
