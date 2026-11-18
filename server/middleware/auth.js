const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Item = require('../models/Item');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'development-only-secret',
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw new ApiError(401, 'You need to sign in to continue.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-only-secret');
  } catch (_error) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new ApiError(401, 'Account no longer exists. Please sign in again.');

  req.user = user;
  next();
});

const requireAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'));
  }
  return next();
};

const ownerOrAdmin = asyncHandler(async (req, _res, next) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found.');
  if (item.reportedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only manage items you reported.');
  }
  req.item = item;
  next();
});

module.exports = { protect, requireAdmin, ownerOrAdmin, signToken };
