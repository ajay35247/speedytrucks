const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT helper
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30d' });

// In-memory OTP store
const otpStore = new Map();

// Twilio (optional)
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio ready');
  } else {
    console.log('⚠️ Twilio not configured - OTP will log to console');
  }
} catch (e) {
  console.log('⚠️ Twilio load failed:', e.message);
}

// ── REGISTER ─────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, company } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered. Please login.' });

    const user = await User.create({
      name, email: email.toLowerCase(), phone: phone || '',
      password, role: role || 'shipper', company: company || '', status: 'active',
    });

    const token = signToken(user._id);
    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, company: user.company, status: user.status },
    });
  } catch (err) {
    console.error('[Register]', err.message);
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered.' });
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ── LOGIN ─────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user)
      return res.status(401).json({ message: 'No account found with this email. Please register.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Wrong password. Please try again.' });

    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });

    const token = signToken(user._id);
    console.log(`[Login] ✅ ${user.email} (${user.role})`);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        phone: user.phone, role: user.role, company: user.company,
        status: user.status, createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('[Login]', err.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ── SEND OTP ─────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    let formatted = phone.toString().trim().replace(/\s/g, '');
    if (!formatted.startsWith('+')) formatted = '+91' + formatted.slice(-10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(formatted, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

    if (twilioClient) {
      try {
        await twilioClient.messages.create({
          body: `Your APTrucking OTP: ${otp}. Valid for 10 minutes. Do not share.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formatted,
        });
        console.log(`[OTP] ✅ Sent to ${formatted}`);
        return res.json({ message: 'OTP sent successfully to ' + formatted });
      } catch (twilioErr) {
        console.error('[Twilio]', twilioErr.code, twilioErr.message);
        if (twilioErr.code === 21608)
          return res.status(400).json({ message: 'Phone not verified in Twilio trial. Go to twilio.com/console → Verified Caller IDs and add this number.' });
        return res.status(500).json({ message: 'Failed to send OTP via SMS. Please try again.' });
      }
    } else {
      // Dev mode - print OTP to Railway logs
      console.log(`[OTP-DEV] ⚠️ Phone: ${formatted} | OTP: ${otp}`);
      return res.json({
        message: 'OTP generated (Twilio not configured - check Railway logs)',
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
      });
    }
  } catch (err) {
    console.error('[SendOTP]', err.message);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

// ── VERIFY OTP ────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

    let formatted = phone.toString().trim().replace(/\s/g, '');
    if (!formatted.startsWith('+')) formatted = '+91' + formatted.slice(-10);

    const stored = otpStore.get(formatted);
    if (!stored) return res.status(400).json({ message: 'OTP not found or expired. Request a new one.' });
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(formatted);
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }
    if (stored.attempts >= 3) {
      otpStore.delete(formatted);
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
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
      message: 'OTP verified successfully!',
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status },
    });
  } catch (err) {
    console.error('[VerifyOTP]', err.message);
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
