const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    tokenVersion: { type: Number, default: 0 },
    mustChangePassword: { type: Boolean, default: false },
    studentId: { type: String, default: '', trim: true, maxlength: 30 },
    department: { type: String, default: '', trim: true, maxlength: 40 },
    phone: { type: String, default: '', trim: true, maxlength: 20 }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
