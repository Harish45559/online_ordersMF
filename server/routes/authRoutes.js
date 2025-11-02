// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { sendMail } = require('../utils/mailer');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ✅ Require models explicitly to avoid "undefined"
const Otp = require('../models/Otp'); // make sure this file exists
let User;
try {
  User = require('../models/User'); // adjust path/name if different
} catch (e) {
  console.warn('⚠️ User model not found; verify-otp will skip user creation.');
}

/* ===========================
   OTP Signup & Verification
=========================== */

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Replace any existing OTPs for this email
    await Otp.destroy({ where: { email } });
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
    console.log(`OTP stored for ${email}`);

    // Send email or log
    if (process.env.DEV_MODE_EMAIL === 'log') {
      console.log(`🟢 DEV OTP for ${email}: ${otpCode}`);
      return res.json({ message: 'OTP generated (logged in server logs)' });
    }

    try {
      await sendMail({
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otpCode}`,
        html: `<p>Your OTP is <b>${otpCode}</b></p>`,
      });
      return res.json({ message: 'OTP sent successfully' });
    } catch (mailErr) {
      console.error('✉️  SMTP send error:', mailErr?.message || mailErr);
      // Don’t block signup because of mail; return success with hint
      return res.status(200).json({
        message:
          'OTP generated but email failed to send. Please enable DEV_MODE_EMAIL=log or fix SMTP settings.',
      });
    }
  } catch (err) {
    console.error('❌ request-otp error (DB/model?):', err?.message || err);
    return res.status(500).json({ message: 'Failed to create OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp, name, password } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP required' });
  }

  try {
    const record = await Otp.findOne({
      where: { email, otp, expiresAt: { [Op.gt]: new Date() } },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Optionally create user if not exists
    let payload = { email };
    if (User) {
      let user = await User.findOne({ where: { email } });
      if (!user) {
        const hashed = password
          ? crypto.createHash('sha256').update(password).digest('hex')
          : null;
        user = await User.create({ email, name, password: hashed });
      }
      payload = { id: user.id, email: user.email };
    }

    // Clean up OTPs for this email
    await Otp.destroy({ where: { email } });

    // Issue JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('❌ verify-otp error:', err?.message || err);
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

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

router.get('/me', authenticateToken, me);
router.put('/me', authenticateToken, updateMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;
