// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  me,
  refreshToken,
  logout,
  updateMe,
  requestOtp,
  verifyOtp,
} = require('../controllers/authController');

const { authenticateToken } = require('../middlewares/authMiddleware');

// ✅ OTP signup routes (must come BEFORE protected ones)
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

// ✅ Regular authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// ✅ Protected routes
router.get('/me', authenticateToken, me);
router.put('/me', authenticateToken, updateMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;
