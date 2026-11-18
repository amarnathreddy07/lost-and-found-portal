const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Item = require('../models/Item');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');
const { jwtExpiresInSeconds } = require('../utils/token');

const COOKIE_NAME = 'sai_lf_token';

function secret() {
  return process.env.JWT_SECRET || '';
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 },
    secret(),
    { expiresIn: jwtExpiresInSeconds() }
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/',
    maxAge: jwtExpiresInSeconds() * 1000
  };
}

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = req.cookies?.[COOKIE_NAME] || bearer;

  if (!token) throw new ApiError(401, 'You need to sign in to continue.');

  let decoded;
  try {
    decoded = jwt.verify(token, secret());
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new ApiError(401, 'Your session has expired. Please sign in again.');
    throw new ApiError(401, 'Invalid session. Please sign in again.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new ApiError(401, 'Account no longer exists. Please sign in again.');
  if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
    throw new ApiError(401, 'Your session was ended. Please sign in again.');
  }

  const allowedPaths = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'];
  const requestPath = req.originalUrl.split('?')[0];
  if (user.mustChangePassword && !allowedPaths.includes(requestPath)) {
    const error = new ApiError(403, 'Change your password before continuing.', [{ code: 'PASSWORD_CHANGE_REQUIRED' }]);
    error.code = 'PASSWORD_CHANGE_REQUIRED';
    throw error;
  }

  req.user = user;
  req.token = token;
  next();
});

const requireAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'));
  }
  return next();
};

const ownerOrAdmin = (paramName = 'id') => asyncHandler(async (req, _res, next) => {
  const item = await Item.findById(req.params[paramName]);
  if (!item) throw new ApiError(404, 'Item not found.');
  if (item.reportedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only manage items you reported.');
  }
  req.item = item;
  next();
});

module.exports = { protect, requireAdmin, ownerOrAdmin, signToken, cookieOptions, COOKIE_NAME };
