const express = require('express');
const router = express.Router();
const { register, login, sendOTP, verifyOTP, getProfile, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',    register);
router.post('/login',       login);
router.post('/send-otp',    sendOTP);
router.post('/verify-otp',  verifyOTP);
router.get('/profile',      protect, getProfile);
router.put('/profile',      protect, updateProfile);

module.exports = router;
