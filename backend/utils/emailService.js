import nodemailer from "nodemailer";

// Port decides the encryption mode: 465 = implicit TLS (secure), 587 = STARTTLS.
// Getting this wrong (e.g. secure:false on 465) makes every send fail.
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

// A POOLED transporter. Without pooling, every sendMail() opens a brand-new
// SMTP connection + login handshake. Firing ~10 invites at once then opens ~10
// parallel connections, and Gmail rejects that with "421 Too many concurrent
// connections" - which is exactly why bulk emails were silently failing.
//
// pool + maxConnections keeps a small set of reused connections, and rateLimit
// spreads messages out so Gmail never sees a burst. nodemailer internally
// queues sendMail() calls to respect these limits, so even a Promise.all of 20
// sends is drained safely a few at a time.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,       // Gmail dislikes many simultaneous logins
  maxMessages: 50,         // recycle a connection after this many messages
  rateDelta: 1000,         // per 1s window...
  rateLimit: 5,            // ...send at most 5 messages
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

// Verify the SMTP credentials once at startup so a misconfiguration shows up in
// the server logs immediately instead of only when the first user tries to
// sign up. Non-fatal: the app still boots so non-email features keep working.
transporter.verify()
  .then(() => console.log("✅ SMTP transporter ready"))
  .catch((err) => console.error("⚠️ SMTP verify failed:", err.message));

// Errors worth retrying: transient SMTP 4xx greylisting/throttling and network
// timeouts. Permanent 5xx failures (bad address, auth) are not retried.
const isTransient = (err) => {
  const code = err?.responseCode;
  if (code && [421, 450, 451, 452].includes(code)) return true;
  if (code && code >= 500) return false;
  return ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET"].includes(err?.code);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const sendEmail = async ({ to, subject, html, text }, { retries = 2 } = {}) => {
  const message = { from: process.env.SMTP_FROM, to, subject, html, text };

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await transporter.sendMail(message);
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isTransient(err)) {
        await wait(1000 * Math.pow(2, attempt)); // 1s, 2s backoff
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

// Send many emails without hammering the SMTP server. The pooled transporter
// already throttles, but sending sequentially gives clear per-recipient logging
// and never rejects the whole batch because one address bounced. Returns a
// summary so callers can report how many actually went out.
export const sendEmailsSafely = async (messages) => {
  let sent = 0;
  const failed = [];
  for (const msg of messages) {
    try {
      await sendEmail(msg);
      sent += 1;
    } catch (err) {
      failed.push(msg.to);
      console.error(`Failed to send email to ${msg.to}:`, err.message);
    }
  }
  return { sent, failed };
};
