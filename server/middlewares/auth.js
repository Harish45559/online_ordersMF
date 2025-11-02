// server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Helper to extract Bearer token or cookie
function getToken(req) {
  const h = req.headers?.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) return m[1];
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

exports.requireAuth = (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.requireAdmin = (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
    req.user = jwt.verify(token, SECRET);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
