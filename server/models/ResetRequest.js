const mongoose = require('mongoose');

const resetRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  note: { type: String, default: '', trim: true, maxlength: 500 },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

resetRequestSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('ResetRequest', resetRequestSchema);
