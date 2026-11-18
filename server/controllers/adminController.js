const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');

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
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, users });
});

exports.updateRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own role.');
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, message: `${user.name} is now an ${user.role}.`, user });
});

exports.removeUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account.');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  await Item.deleteMany({ reportedBy: user._id });
  await Claim.deleteMany({ claimant: user._id });
  res.json({ success: true, message: 'User and related records deleted.' });
});
