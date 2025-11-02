// server/utils/mailer.js
const nodemailer = require('nodemailer');

const {
  EMAIL_PROVIDER,           // 'smtp' | 'resend' (default: smtp)
  // SMTP
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
  // Resend
  RESEND_API_KEY,
  RESEND_FROM,              // e.g. "Mirchi Mafiya <noreply@yourdomain.com>"
} = process.env;

const provider = (EMAIL_PROVIDER || 'smtp').toLowerCase();

async function sendWithSmtp({ to, subject, html, text }) {
  if (!SMTP_HOST) console.warn('⚠️ SMTP_HOST missing');
  if (!SMTP_USER) console.warn('⚠️ SMTP_USER missing');
  if (!SMTP_FROM) console.warn('⚠️ SMTP_FROM missing');

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE).toLowerCase() === 'true', // true for 465, false for 587
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: {
      // rejectUnauthorized: false, // uncomment only if your provider needs it
    },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const info = await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return info;
}

async function sendWithResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
  const { Resend } = require('resend');
  const resend = new Resend(RESEND_API_KEY);

  const from = RESEND_FROM || SMTP_FROM || SMTP_USER;
  if (!from) throw new Error('RESEND_FROM (or SMTP_FROM/SMTP_USER) is required for sender identity');

  const resp = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (resp.error) throw new Error(resp.error.message || 'Resend send failed');
  return resp;
}

async function sendMail({ to, subject, html, text }) {
  if (provider === 'resend') {
    return sendWithResend({ to, subject, html, text });
  }
  return sendWithSmtp({ to, subject, html, text });
}

module.exports = { sendMail };
