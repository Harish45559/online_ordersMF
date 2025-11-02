// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT and attach the corresponding user record.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token signature and extract payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Attach full user object to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
  }
};

/**
 * Middleware to restrict routes to admin users only.
 */
const isAdmin = (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: 'Access denied: Admins only.' });
  } catch (err) {
    console.error('Admin check error:', err.message);
    res.status(500).json({ message: 'Access check failed', error: err.message });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
};
