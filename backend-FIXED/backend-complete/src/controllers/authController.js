const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30d' });

// OTP store (in-memory)
const otpStore = new Map();

// Twilio setup
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio ready');
  }
} catch (e) {
  console.log('⚠️ Twilio not available:', e.message);
}

// ── REGISTER ──────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, company } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, email: email.toLowerCase(), phone, password,
      role: role || 'shipper', company: company || '', status: 'active',
    });

    const token = signToken(user._id);
    res.status(201).json({
      message: 'Account created successfully', token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, company: user.company, status: user.status },
    });
  } catch (err) {
    console.error('[Register Error]', err.message);
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: 'Registration failed. Try again.' });
  }
};

// ── LOGIN ─────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended. Contact support.' });

    const token = signToken(user._id);
    res.json({
      message: 'Login successful', token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, company: user.company, status: user.status, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error('[Login Error]', err.message);
    res.status(500).json({ message: 'Login failed. Try again.' });
  }
};

// ── SEND OTP ──────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });

    let formatted = phone.trim().replace(/\s/g, '');
    if (!formatted.startsWith('+')) formatted = '+91' + formatted.slice(-10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(formatted, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

    if (twilioClient) {
      await twilioClient.messages.create({
        body: `Your APTrucking OTP: ${otp}. Valid 10 mins. Do not share.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formatted,
      });
      console.log(`[OTP] Sent to ${formatted}`);
      return res.json({ message: 'OTP sent successfully' });
    } else {
      // Dev mode - log to Railway console
      console.log(`[OTP-DEV] ${formatted} → ${otp}`);
      return res.json({ message: 'OTP sent (check logs)', ...(process.env.NODE_ENV !== 'production' && { otp }) });
    }
  } catch (err) {
    console.error('[SendOTP Error]', err.message);
    if (err.code === 21608) return res.status(400).json({ message: 'Phone not verified in Twilio. Add it at twilio.com/console' });
    res.status(500).json({ message: 'Failed to send OTP. Try again.' });
  }
};

// ── VERIFY OTP ────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP required' });

    let formatted = phone.trim().replace(/\s/g, '');
    if (!formatted.startsWith('+')) formatted = '+91' + formatted.slice(-10);

    const stored = otpStore.get(formatted);
    if (!stored) return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(formatted);
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }
    if (stored.attempts >= 3) {
      otpStore.delete(formatted);
      return res.status(400).json({ message: 'Too many attempts. Request a new OTP.' });
    }
    if (stored.otp !== otp.toString()) {
      stored.attempts++;
      return res.status(400).json({ message: `Wrong OTP. ${3 - stored.attempts} attempts left.` });
    }

    otpStore.delete(formatted);

    let user = await User.findOne({ phone: formatted });
    if (!user) {
      user = await User.create({
        name: 'User ' + formatted.slice(-4),
        email: `user${Date.now()}@aptrucking.in`,
        phone: formatted,
        password: Math.random().toString(36) + 'Aa1!',
        role: 'shipper', status: 'active',
      });
    }

    const token = signToken(user._id);
    res.json({
      message: 'OTP verified', token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status },
    });
  } catch (err) {
    console.error('[VerifyOTP Error]', err.message);
    res.status(500).json({ message: 'OTP verification failed.' });
  }
};

// ── GET PROFILE ───────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

// ── UPDATE PROFILE ────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'company', 'pushToken'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, select: '-password' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
