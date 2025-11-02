// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { sendMail } = require('../utils/mailer');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { Op } = require('sequelize');
const { User, Otp } = require('../models'); // adjust to your actual models
const crypto = require('crypto');

/* ===========================
   OTP Signup & Verification
=========================== */

// ✅ Request OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { email, name, password } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store it (replace this with your own model logic)
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    });

    // Send mail
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
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP required' });
    }

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

    // You can now create the user or mark verified
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({ email, name: req.body.name, password });
    }

    // Clean up OTP
    await Otp.destroy({ where: { email } });

    // Issue JWT token (if you have a helper for that)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/* ===========================
   Regular Auth Routes
=========================== */

const {
  register,
  login,
  me,
  refreshToken,
  logout,
  updateMe,
} = require('../controllers/authController');

// ✅ Regular authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// ✅ Protected routes
router.get('/me', authenticateToken, me);
router.put('/me', authenticateToken, updateMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;
