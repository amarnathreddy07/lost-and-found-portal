const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { signToken, cookieOptions, COOKIE_NAME } = require('../middleware/auth');
const { departmentFromEmail } = require('../config/accounts');

const DUMMY_HASH = bcrypt.hashSync('unused-dummy-password', 10);

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    department: user.department,
    phone: user.phone,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

function issueSession(res, user) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, studentId, phone } = req.body;
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    studentId: studentId || '',
    department: departmentFromEmail(normalizedEmail),
    phone: phone || '',
    role: 'user'
  });

  const token = issueSession(res, user);
  res.status(201).json({ success: true, message: 'Account created. Welcome to the portal!', token, user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');

  if (!user) {
    await bcrypt.compare(String(password || ''), DUMMY_HASH);
    throw new ApiError(401, 'Incorrect email or password.');
  }
  if (!(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  const token = issueSession(res, user);
  res.json({ success: true, message: `Welcome back, ${user.name.split(' ')[0]}!`, token, user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password))) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  const token = issueSession(res, user);
  res.json({ success: true, message: 'Password changed successfully.', token, user: publicUser(user) });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  }
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ success: true, message: 'Signed out successfully.' });
});
