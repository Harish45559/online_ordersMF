// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { sendMail } = require('../utils/mailer');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ✅ Individual models
const Otp = require('../models/Otp'); // your new model
let User;
try {
  User = require('../models/User'); // adjust if your user model file has a different name
} catch (err) {
  console.warn('⚠️ User model not found; verify-otp will skip user creation.');
}

/* =========================================================
   OTP Signup & Verification
========================================================= */

// ✅ Request OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTPs for the same email, then store new
    await Otp.destroy({ where: { email } });
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min validity
    });

    // Send OTP via email
    if (process.env.DEV_MODE_EMAIL === 'log') {
      console.log(`🟢 DEV OTP for ${email}: ${otpCode}`);
    } else {
      await sendMail({
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otpCode}`,
        html: `<p>Your OTP is <b>${otpCode}</b></p>`,
      });
    }

    return res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP Send Error:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// ✅ Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, password } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP required' });
    }

    // Check if OTP is valid and not expired
    const record = await Otp.findOne({
      where: {
        email,
        otp,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create or fetch user
    let userPayload = { email };
    if (User) {
      let user = await User.findOne({ where: { email } });
      if (!user) {
        const hashed = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
        user = await User.create({ email, name, password: hashed });
      }
      userPayload = { id: user.id, email: user.email };
    }

    // Remove OTP after use
    await Otp.destroy({ where: { email } });

    // Issue JWT token
    const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/* =========================================================
   Regular Auth Routes
========================================================= */

const {
  register,
  login,
  me,
  refreshToken,
  logout,
  updateMe,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

router.get('/me', authenticateToken, me);
router.put('/me', authenticateToken, updateMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;
