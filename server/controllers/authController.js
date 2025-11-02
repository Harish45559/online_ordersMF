const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer'); // ✅ newly added import

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// --- Helpers ---
const normalizePostcode = (pc) =>
  (pc || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const isUkPostcode = (pc) =>
  /^(GIR\s?0AA|BFPO\s?[0-9]{1,4}|(ASCN|STHL|TDCU|BBND|BIQQ|FIQQ|GX11|PCRN|SIQQ|TKCA)\s?1ZZ|[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})$/i.test(
    String(pc || '').trim()
  );

// ========= OTP store (demo: memory; for prod use Redis/DB) =========
const otpStore = {}; // { [email]: { otp, name, password, expires } }
const OTP_EXPIRY_MS = 5 * 60 * 1000;

// ========= Standard register/login/me/update =========
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Missing required fields' });

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hash,
      role,
    });

    const token = sign({ id: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = sign({ id: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const u = await User.findByPk(req.user.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        mobile: u.mobile || null,
        dob: u.dob || null,
        addressLine1: u.addressLine1 || null,
        addressLine2: u.addressLine2 || null,
        city: u.city || null,
        county: u.county || null,
        postcode: u.postcode || null,
        country: u.country || 'United Kingdom',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const {
      name,
      mobile,
      dob,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      country,
    } = req.body;

    const u = await User.findByPk(req.user.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    // Basic fields
    if (typeof name === 'string') u.name = name.trim();
    if (typeof mobile !== 'undefined') u.mobile = mobile || null;
    if (typeof dob !== 'undefined') u.dob = dob || null;

    if (typeof addressLine1 !== 'undefined') u.addressLine1 = addressLine1 || null;
    if (typeof addressLine2 !== 'undefined') u.addressLine2 = addressLine2 || null;
    if (typeof city !== 'undefined') u.city = city || null;
    if (typeof county !== 'undefined') u.county = county || null;

    // Normalize and validate postcode
    const incomingPostcodeProvided = typeof postcode !== 'undefined';
    const candidatePcRaw = incomingPostcodeProvided ? postcode : u.postcode;
    let pc = normalizePostcode(candidatePcRaw);

    if (!pc) {
      pc = null;
    } else if (!isUkPostcode(pc)) {
      return res.status(400).json({ message: 'Invalid UK postcode' });
    }
    u.postcode = pc;

    // Country default
    if (typeof country !== 'undefined') {
      const c = (country || '').trim();
      u.country = c || 'United Kingdom';
    } else if (!u.country) {
      u.country = 'United Kingdom';
    }

    try {
      await u.save();
    } catch (dbErr) {
      const msg = String(dbErr?.message || '');
      if (msg.includes('users_postcode_uk_chk')) {
        return res.status(400).json({ message: 'Invalid UK postcode (DB constraint)' });
      }
      throw dbErr;
    }

    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        mobile: u.mobile || null,
        dob: u.dob || null,
        addressLine1: u.addressLine1 || null,
        addressLine2: u.addressLine2 || null,
        city: u.city || null,
        county: u.county || null,
        postcode: u.postcode || null,
        country: u.country || 'United Kingdom',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const fresh = sign({ id: decoded.id, role: decoded.role });
    res.json({ token: fresh });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

exports.logout = async (_req, res) => {
  res.json({ message: 'Logged out' });
};

// ========= NEW: OTP endpoints =========
exports.requestOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Missing fields' });

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ message: 'Email already registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      otp,
      name: name.trim(),
      password, // store raw temporarily, will hash on verify
      expires: Date.now() + OTP_EXPIRY_MS,
    };

    // ✅ Send OTP via email
    await sendOtpEmail(email, otp, name.trim());
    res.json({ message: 'OTP sent to your email address' });
  } catch (err) {
    console.error('OTP Send Error:', err);
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const entry = otpStore[email];
    if (!entry) return res.status(400).json({ message: 'No OTP requested' });
    if (Date.now() > entry.expires) return res.status(400).json({ message: 'OTP expired' });
    if (entry.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    const hash = await bcrypt.hash(entry.password, 10);
    const user = await User.create({
      name: entry.name,
      email: email.toLowerCase(),
      password: hash,
      role: 'user',
    });

    delete otpStore[email];

    const token = sign({ id: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('OTP Verify Error:', err);
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};
