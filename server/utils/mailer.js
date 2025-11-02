// server/utils/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn('[mailer] Missing SMTP env vars — emails will fail to send.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for 587/25
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

async function sendOtpEmail(to, otp, displayName = 'User') {
  const from = `"Online Orders" <${SMTP_USER}>`;
  const subject = 'Your One-Time Password (OTP)';
  const text = `Hi ${displayName},

Your OTP is: ${otp}

This code will expire in 5 minutes. If you didn’t request it, you can ignore this email.`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
      <p>Hi ${displayName},</p>
      <p>Your OTP is:</p>
      <p style="font-size:22px;font-weight:700;letter-spacing:2px;">${otp}</p>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn’t request it, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendOtpEmail };
