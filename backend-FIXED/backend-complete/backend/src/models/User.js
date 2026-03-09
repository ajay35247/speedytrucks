const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, trim: true, default: '' },
  password: { type: String, required: true, select: false, minlength: 6 },
  role:     { type: String, enum: ['shipper','transporter','admin','fleet_owner'], default: 'shipper' },
  company:  { type: String, default: '' },
  status:   { type: String, enum: ['active','inactive','suspended','pending'], default: 'active' },
  pushToken:    { type: String, default: '' },
  referralCode: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
