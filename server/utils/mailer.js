// server/utils/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
} = process.env;

if (!SMTP_HOST) console.warn('⚠️ SMTP_HOST missing');
if (!SMTP_USER) console.warn('⚠️ SMTP_USER missing');
if (!SMTP_FROM) console.warn('⚠️ SMTP_FROM missing');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE).toLowerCase() === 'true', // true for 465, false for 587
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  tls: {
    // Let STARTTLS upgrade happen; keep verification on (better security)
    // If your provider uses a custom cert and you must bypass (not recommended):
    // rejectUnauthorized: false,
  },
  connectionTimeout: 15_000, // 15s
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return info;
}

module.exports = { transporter, sendMail };
