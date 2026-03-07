const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  role:     { type: String, enum: ["admin", "shipper", "owner", "broker"], required: true },
  status:   { type: String, enum: ["active", "suspended", "pending_kyc", "banned"], default: "pending_kyc" },
  company:  { type: String, trim: true },
  avatar:   String,
  gstNumber: String,
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  kycStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
  twoFactorEnabled: { type: Boolean, default: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
  walletBalance: { type: Number, default: 0, min: 0 },
  suspendReason: String,
  adminNotes:    String,
  lastLogin:  Date,
  loginCount: { type: Number, default: 0 },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil:  Date,
}, { timestamps: true, toJSON: { virtuals: true } });

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePwd) {
  return bcrypt.compare(candidatePwd, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.virtual("initials").get(function () {
  return this.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
});

module.exports = mongoose.model("User", userSchema);