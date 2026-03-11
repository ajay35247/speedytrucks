import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:          { type: String, default: '', trim: true },
  password:       { type: String, required: true, minlength: 6, select: false },
  role:           { type: String, enum: ['admin','shipper','transporter','broker'], default: 'shipper' },
  company:        { type: String, default: '' },
  status:         { type: String, enum: ['active','suspended','pending'], default: 'active' },
  kycStatus:      { type: String, enum: ['not_started','pending','approved','rejected'], default: 'not_started' },
  walletBalance:  { type: Number, default: 0 },
  refreshToken:   { type: String, select: false },
  resetToken:     { type: String, select: false },
  resetExpiry:    { type: Date, select: false },
  loginAttempts:  { type: Number, default: 0 },
  lockUntil:      { type: Date },
  twoFAEnabled:   { type: Boolean, default: false },
  phoneVerified:  { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

export default mongoose.model('User', userSchema);
