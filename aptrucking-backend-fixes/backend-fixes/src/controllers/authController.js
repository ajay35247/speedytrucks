const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');

// ─── JWT helpers ────────────────────────────────
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '30d',
  });
};

// ─── Twilio client (optional - only if env vars set) ──
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio initialized');
  } catch (e) {
    console.log('⚠️ Twilio init failed:', e.message);
  }
} else {
  console.log('⚠️ Twilio env vars missing - OTP disabled');
}

// ─── In-memory OTP store (use Redis in production) ──
const otpStore = new Map();

// ─── REGISTER ────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });
    if (existing) {
      return res.status(400).json({
        message: existing.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Phone number already registered'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: role || 'shipper',
      company: company || '',
      status: 'active',
    });

    const token = signToken(user._id);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('[Register]', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ─── LOGIN ───────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user + include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    const token = signToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('[Login]', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ─── SEND OTP ─────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Format phone number
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/\D/g, '').slice(-10);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(formattedPhone, { otp, expiresAt, attempts: 0 });

    // Send via Twilio if configured
    if (twilioClient) {
      try {
        await twilioClient.messages.create({
          body: `Your APTrucking OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        console.log(`[OTP] Sent to ${formattedPhone}`);
        return res.json({ message: 'OTP sent successfully', phone: formattedPhone });
      } catch (twilioErr) {
        console.error('[Twilio Error]', twilioErr.message);
        // If Twilio trial - unverified number error
        if (twilioErr.code === 21608) {
          return res.status(400).json({
            message: 'This phone number is not verified in Twilio trial account. Please verify it at twilio.com/console first.',
          });
        }
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
      }
    } else {
      // Dev mode - log OTP to console
      console.log(`[OTP DEV] Phone: ${formattedPhone}, OTP: ${otp}`);
      return res.json({
        message: 'OTP sent (dev mode - check Railway logs)',
        phone: formattedPhone,
        // Remove this in production!
        devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    }
  } catch (err) {
    console.error('[SendOTP]', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// ─── VERIFY OTP ──────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/\D/g, '').slice(-10);
    }

    const stored = otpStore.get(formattedPhone);

    if (!stored) {
      return res.status(400).json({ message: 'OTP not found or expired. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(formattedPhone);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (stored.attempts >= 3) {
      otpStore.delete(formattedPhone);
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (stored.otp !== otp.toString()) {
      stored.attempts += 1;
      return res.status(400).json({ message: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` });
    }

    // OTP correct - delete it
    otpStore.delete(formattedPhone);

    // Find or create user by phone
    let user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      // Auto-create account
      user = await User.create({
        name: 'User ' + formattedPhone.slice(-4),
        email: `user${Date.now()}@aptrucking.in`,
        phone: formattedPhone,
        password: Math.random().toString(36),
        role: 'shipper',
        status: 'active',
      });
    }

    const token = signToken(user._id);

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('[VerifyOTP]', err);
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

// ─── GET PROFILE ─────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

// ─── UPDATE PROFILE ──────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.company !== undefined) updates.company = req.body.company;
    if (req.body.pushToken) updates.pushToken = req.body.pushToken;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true, select: '-password'
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
