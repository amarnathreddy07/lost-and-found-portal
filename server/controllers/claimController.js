const Claim = require('../models/Claim');
const Item = require('../models/Item');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');

function reporterId(item) {
  return String(item.reportedBy?._id || item.reportedBy || '');
}

exports.create = asyncHandler(async (req, res) => {
  const { itemId, proof } = req.body;
  const item = await Item.findById(itemId);
  if (!item) throw new ApiError(404, 'That listing no longer exists.');
  if (reporterId(item) === String(req.user.id)) {
    throw new ApiError(400, 'You cannot claim an item you reported yourself.');
  }
  if (item.status !== 'active') {
    throw new ApiError(409, 'This item is no longer accepting claims.');
  }

  let claim = await Claim.findOne({ item: item._id, claimant: req.user.id });
  let resubmitted = false;
  if (claim) {
    if (claim.status !== 'rejected') {
      throw new ApiError(409, 'You have already submitted a claim for this item.');
    }
    claim.proof = proof;
    claim.status = 'pending';
    claim.reviewedAt = undefined;
    claim.reviewedBy = undefined;
    resubmitted = true;
  } else {
    claim = new Claim({ item: item._id, claimant: req.user.id, proof });
  }

  await claim.save();
  await claim.populate('claimant', 'name');
  await claim.populate('item', 'title type imageUrl status');
  res.status(201).json({
    success: true,
    message: resubmitted
      ? 'Claim resubmitted. The reporter can now review it.'
      : 'Claim submitted. The reporter can now review it.',
    claim
  });
});

exports.mine = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimant: req.user.id })
    .sort({ createdAt: -1 })
    .populate('item', 'title type category imageUrl status location date')
    .populate('reviewedBy', 'name')
    .lean();
  res.json({ success: true, claims });
});

exports.received = asyncHandler(async (req, res) => {
  const items = await Item.find({ reportedBy: req.user.id }).select('_id');
  const claims = await Claim.find({ item: { $in: items.map((item) => item._id) } })
    .sort({ createdAt: -1 })
    .populate('item', 'title type category imageUrl status location date')
    .populate('claimant', 'name email studentId phone')
    .lean();
  res.json({ success: true, claims });
});

async function syncItemStatus(itemId) {
  const approved = await Claim.exists({ item: itemId, status: 'approved' });
  const item = await Item.findById(itemId);
  if (!item) return;

  if (approved && item.status !== 'claimed') item.status = 'claimed';
  else if (!approved && item.status === 'claimed') item.status = 'active';

  if (item.isModified('status')) await item.save();
}

exports.forItem = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ item: req.params.itemId })
    .sort({ createdAt: -1 })
    .populate('claimant', 'name email studentId phone')
    .populate('reviewedBy', 'name')
    .lean();
  res.json({ success: true, claims });
});

exports.review = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) throw new ApiError(404, 'Claim not found.');

  const item = await Item.findById(claim.item);
  if (!item) throw new ApiError(404, 'The linked listing no longer exists.');
  if (reporterId(item) !== String(req.user.id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the item reporter or an admin can review this claim.');
  }

  if (claim.status !== 'pending') {
    throw new ApiError(409, 'This claim has already been reviewed.');
  }

  const { decision } = req.body;
  claim.status = decision;
  claim.reviewedAt = new Date();
  claim.reviewedBy = req.user._id;
  await claim.save();

  if (decision === 'approved') {
    await Claim.updateMany(
      { item: claim.item, _id: { $ne: claim._id }, status: { $in: ['pending', 'approved'] } },
      { status: 'rejected', reviewedAt: new Date(), reviewedBy: req.user._id }
    );
  }

  await syncItemStatus(claim.item);
  await claim.populate('claimant', 'name email studentId phone');
  await claim.populate('item', 'title status imageUrl');
  res.json({
    success: true,
    message: decision === 'approved' ? 'Claim approved and item marked as claimed.' : 'Claim rejected.',
    claim
  });
});

exports.all = asyncHandler(async (_req, res) => {
  const claims = await Claim.find()
    .sort({ createdAt: -1 })
    .populate({
      path: 'item',
      select: 'title type status imageUrl',
      populate: { path: 'reportedBy', select: 'name' }
    })
    .populate('claimant', 'name email')
    .populate('reviewedBy', 'name')
    .lean();
  res.json({ success: true, claims });
});
