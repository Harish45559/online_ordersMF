const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { sendMail } = require("../utils/mailer");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Models
const Otp = require("../models/Otp");
let User;
try {
  User = require("../models/User");
} catch (e) {
  console.warn("⚠️ User model not found; verify-otp will skip user creation.");
}

/* ===========================
   OTP Signup & Verification
=========================== */

// POST /api/auth/request-otp
router.post("/request-otp", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any old OTPs and save new one
    await Otp.destroy({ where: { email } });
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    console.log("➡️  /request-otp called for:", email);
    console.log("🧮 Generated OTP:", otpCode);

    if (process.env.DEV_MODE_EMAIL === "log") {
      console.log(`🟢 DEV OTP for ${email}: ${otpCode}`);
      return res.json({ message: "OTP generated (logged in server logs)" });
    }

    try {
      console.log("✉️  Attempting to send OTP email to:", email);
      const info = await sendMail({
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otpCode}`,
        html: `<p>Your OTP is <b>${otpCode}</b></p>`,
      });
      console.log("✅ OTP email sent:", info?.messageId || info);
      return res.json({ message: "OTP sent successfully" });
    } catch (mailErr) {
      const errMsg = mailErr?.message || String(mailErr);
      console.error("🔴 SMTP send error:", errMsg);

      // DEV-ONLY: return the real SMTP error so you can fix quickly
      if ((process.env.NODE_ENV || "").toLowerCase() !== "production") {
        return res.status(500).json({
          message: "SMTP error (dev)",
          error: errMsg,
        });
      }

      // Production-safe fallback
      return res.status(200).json({
        message:
          "OTP generated but email failed to send. Please enable DEV_MODE_EMAIL=log or fix SMTP settings.",
      });
    }
  } catch (err) {
    console.error("❌ request-otp error:", err?.message || err);
    return res.status(500).json({ message: "Failed to create OTP" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const { email, otp, name, password } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  try {
    console.log("➡️  /verify-otp called for:", email, "OTP:", otp);
    const record = await Otp.findOne({
      where: { email, otp, expiresAt: { [Op.gt]: new Date() } },
      order: [["createdAt", "DESC"]],
    });

    if (!record) {
      console.warn("⚠️ Invalid or expired OTP for:", email);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // If user exists: allow login without password change
    let payload = { email };
    if (User) {
      let user = await User.findOne({ where: { email } });

      if (!user) {
        if (!password || String(password).trim() === "") {
          return res.status(400).json({
            message:
              "Password is required to create your account. Please submit email, otp, name, and password.",
          });
        }

        const hashed = await bcrypt.hash(String(password), 10);
        user = await User.create({ email, name, password: hashed });
        console.log("👤 New user created:", user.email);
      } else {
        console.log("👤 Existing user logged in:", user.email);
      }

      payload = { id: user.id, email: user.email };
    }

    await Otp.destroy({ where: { email } }); // Clean up OTP

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    console.log("✅ OTP verified successfully for:", email);
    return res.json({ message: "OTP verified", token });
  } catch (err) {
    console.error("❌ verify-otp error:", err?.message || err);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });
  try {
    const existing = await Otp.findOne({ where: { email } });
    if (!existing) return res.status(404).json({ message: "No OTP to resend" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    existing.otp = otpCode;
    existing.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await existing.save();

    console.log("↪️  Resending OTP to:", email, "OTP:", otpCode);

    if (process.env.DEV_MODE_EMAIL === "log") {
      console.log(`🟢 DEV RESEND OTP for ${email}: ${otpCode}`);
      return res.json({ message: "OTP resent (logged in server logs)" });
    }

    try {
      const info = await sendMail({
        to: email,
        subject: "Your new OTP Code",
        text: `Your new OTP is ${otpCode}`,
        html: `<p>Your new OTP is <b>${otpCode}</b></p>`,
      });
      console.log("✅ OTP resent successfully to:", email, info?.messageId || info);
      res.json({ message: "OTP resent successfully" });
    } catch (mailErr) {
      const errMsg = mailErr?.message || String(mailErr);
      console.error("🔴 resend-otp SMTP error:", errMsg);

      if ((process.env.NODE_ENV || "").toLowerCase() !== "production") {
        return res.status(500).json({ message: "SMTP error (dev)", error: errMsg });
      }

      return res.status(200).json({
        message:
          "OTP generated but email failed to send. Please enable DEV_MODE_EMAIL=log or fix SMTP settings.",
      });
    }
  } catch (err) {
    console.error("🔴 resend-otp error:", err);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
});

/* ===========================
   Diagnostic email route
=========================== */

// POST /api/auth/_diag/email
router.post("/_diag/email", async (req, res) => {
  const { to } = req.body || {};
  const recipient =
    to || process.env.SMTP_USER || process.env.DEFAULT_TEST_EMAIL;
  if (!recipient)
    return res
      .status(400)
      .json({ ok: false, message: "Provide 'to' or set DEFAULT_TEST_EMAIL" });

  try {
    console.log("📧 _diag/email sending test to:", recipient);
    const info = await sendMail({
      to: recipient,
      subject: "Email Diagnostic",
      text: "If you got this, your SMTP configuration works.",
      html: "<p>If you got this, your SMTP configuration works.</p>",
    });
    console.log("✅ _diag/email success:", info?.messageId || info);
    res.json({ ok: true, info });
  } catch (e) {
    console.error("🔴 _diag/email error:", e?.message || e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
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
  forgotPassword,     // ✅ added
  resetPassword,      // ✅ added
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);

router.get("/me", authenticateToken, me);
router.put("/me", authenticateToken, updateMe);
router.post("/logout", authenticateToken, logout);

// ✅ NEW: Forgot/Reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
