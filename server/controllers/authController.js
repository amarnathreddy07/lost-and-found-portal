const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { signToken } = require('../middleware/auth');

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    phone: user.phone
  };
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, studentId, phone } = req.body;
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    studentId: studentId || '',
    phone: phone || '',
    role: 'user'
  });

  const token = signToken(user);
  res.status(201).json({ success: true, message: 'Account created. Welcome to the portal!', token, user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  const token = signToken(user);
  res.json({ success: true, message: `Welcome back, ${user.name.split(' ')[0]}!`, token, user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

exports.logout = (_req, res) => {
  res.json({ success: true, message: 'Signed out successfully.' });
};
