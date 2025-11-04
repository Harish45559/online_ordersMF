const nodemailer = require("nodemailer");

const {
  EMAIL_PROVIDER,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
  RESEND_API_KEY,
  RESEND_FROM,
} = process.env;

const provider = (EMAIL_PROVIDER || "smtp").toLowerCase();
const DEBUG_EMAIL = String(process.env.LOG_EMAIL || "").toLowerCase() === "true";

/**
 * Send email via SMTP (e.g., Gmail)
 */
async function sendWithSmtp({ to, subject, html, text }) {
  const secure = String(SMTP_SECURE || "").toLowerCase() === "true";
  const port = Number(SMTP_PORT || 587);
  const from = SMTP_FROM || SMTP_USER;

  if (DEBUG_EMAIL) {
    console.log("📨 SMTP config:", {
      host: SMTP_HOST,
      port,
      secure,
      hasAuth: Boolean(SMTP_USER && SMTP_PASS),
      from,
      to,
      subject,
    });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure, // true for 465, false for 587
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  // Verify connection before sending
  try {
    await transporter.verify();
    if (DEBUG_EMAIL) console.log("✅ SMTP verify OK");
  } catch (err) {
    console.error("🔴 SMTP verify failed:", err?.message || err);
    throw err;
  }

  // Send mail
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    if (DEBUG_EMAIL) console.log("✅ Message sent:", info?.messageId || info);
    return info;
  } catch (err) {
    console.error("🔴 SMTP sendMail failed:", err?.message || err);
    throw err;
  }
}

/**
 * Send email via Resend (fallback option)
 */
async function sendWithResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const { Resend } = require("resend");
  const resend = new Resend(RESEND_API_KEY);

  const from = RESEND_FROM || SMTP_FROM || SMTP_USER;
  if (!from) throw new Error("RESEND_FROM (or SMTP_FROM/SMTP_USER) is required");

  const resp = await resend.emails.send({ from, to, subject, html, text });
  if (resp.error) throw new Error(resp.error.message || "Resend send failed");
  if (DEBUG_EMAIL) console.log("✅ Resend sent:", resp?.id || resp);
  return resp;
}

/**
 * Generic mail function - picks provider and handles dev logging
 */
async function sendMail(args) {
  if (String(process.env.DEV_MODE_EMAIL).toLowerCase() === "log") {
    console.log("✉️ (DEV log) to:", args.to, "subj:", args.subject);
    if (args.text) console.log("TEXT:", args.text);
    if (args.html) console.log("HTML:", args.html);
    return { ok: true, logged: true };
  }

  if (provider === "resend") return sendWithResend(args);
  return sendWithSmtp(args);
}

module.exports = { sendMail };
