import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/userModel.js";
import SignupOtp from "../models/signupOtpModel.js";
import admin from "../config/firebaseAdmin.js";
import { isValidEmail, validatePassword } from "../middleware/validate.js";
import { sendEmail } from "../utils/emailService.js";
import { findOrCreateUser, attributeReferral, recordActiveDay } from "../utils/referralService.js";
import { ATTRIBUTION_WINDOW_HOURS } from "../config/referralConfig.js";


// NOTE: the old `register` handler was removed. It created a fully working
// Firebase + Mongo account from name/email/password with no email verification
// at all, so it was a straight bypass of the signup OTP for anyone who posted
// to it directly. Nothing called it - signup now goes through
// sendSignupOtp -> verifySignupOtp, which is the only way an account is made.

// -------------------- SIGNUP EMAIL VERIFICATION --------------------
// Builds the branded 6-digit verification email used at signup.
const buildSignupOtpEmail = ({ name, otp, frontendUrl }) => {
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06101C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06101C;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0B1A2B;border-radius:20px;overflow:hidden;border:1px solid rgba(8,145,178,0.15);">
        <tr>
          <td style="background:linear-gradient(135deg,#0A2540 0%,#0D2E50 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(8,145,178,0.2);">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <img src="${logoUrl}" alt="SplitEase" width="44" height="44" style="border-radius:12px;border:1px solid rgba(8,145,178,0.3);display:block;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SplitEase</span>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:rgba(8,145,178,0.8);letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">Verify your email</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hi <strong style="color:#e2e8f0;">${name || "there"}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
              Welcome to SplitEase! Enter the code below to verify your email and finish creating your account. This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 28px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,rgba(8,145,178,0.12),rgba(14,116,144,0.08));border:1.5px solid rgba(8,145,178,0.35);border-radius:16px;padding:24px 48px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(8,145,178,0.7);letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
                    <p style="margin:0;font-size:42px;font-weight:800;color:#ffffff;letter-spacing:10px;font-variant-numeric:tabular-nums;">${otp}</p>
                  </div>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#475569;">• This code is valid for <strong style="color:#94a3b8;">10 minutes</strong> only.</p>
                  <p style="margin:0 0 6px;font-size:12px;color:#475569;">• Never share this code with anyone.</p>
                  <p style="margin:0;font-size:12px;color:#475569;">• If you didn't try to sign up, <strong style="color:#f87171;">ignore this email</strong>.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#1e3a4f;">© ${new Date().getFullYear()} SplitEase · Email Verification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// -------------------- SEND SIGNUP OTP --------------------
// Verifies the email is real and not already taken BEFORE any account exists.
export const sendSignupOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Name must be at least 2 characters." });
    if (name.trim().length > 100)
      return res.status(400).json({ field: "name", message: "Name must be under 100 characters." });
    if (!isValidEmail(email))
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    // Checked here as well as at verify time so a weak password fails before we
    // spend an email send on it. The password itself is never stored.
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ field: "password", message: pwErr });

    const normalizedEmail = email.trim().toLowerCase();

    // Reject duplicates up front - in Mongo and in Firebase.
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(400).json({ field: "email", message: "An account with this email already exists. Please sign in instead." });

    try {
      await admin.auth().getUserByEmail(normalizedEmail);
      // If the above didn't throw, the email exists in Firebase.
      return res.status(400).json({ field: "email", message: "An account with this email already exists. Please sign in instead." });
    } catch (fbErr) {
      // auth/user-not-found is the expected happy path; anything else is a real error.
      if (fbErr.code !== "auth/user-not-found") {
        console.error("Firebase getUserByEmail error:", fbErr.message);
      }
    }

    // Throttle resend: block if a code was sent < 60s ago.
    const existingOtp = await SignupOtp.findOne({ email: normalizedEmail });
    if (existingOtp && Date.now() - existingOtp.lastSentAt.getTime() < 60 * 1000) {
      return res.status(429).json({ message: "A code was just sent. Please wait a moment before requesting another." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await SignupOtp.findOneAndUpdate(
      { email: normalizedEmail },
      { name: name.trim(), otpHash, expiresAt, attempts: 0, lastSentAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email for SplitEase",
      html: buildSignupOtpEmail({ name: name.trim(), otp, frontendUrl }),
    });

    res.status(200).json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Send Signup OTP Error:", err?.responseCode, err?.message);

    // Distinguish a provider quota/rate block (e.g. Gmail "550 Daily user
    // sending limit exceeded") from a generic failure. A quota block is an
    // operational issue (the mailbox is out of daily sends), not a bug - the
    // fix is a higher-volume email provider, not a retry.
    const isQuota =
      err?.responseCode === 550 ||
      err?.responseCode === 421 ||
      err?.responseCode === 452 ||
      /limit exceeded|quota|rate limit|too many/i.test(err?.message || "");

    if (isQuota) {
      // Roll back the stored code so a later retry (after the limit resets or a
      // new provider is configured) can re-send cleanly.
      const em = req.body?.email?.trim?.().toLowerCase();
      if (em) await SignupOtp.deleteOne({ email: em }).catch(() => {});
      return res.status(503).json({
        message: "Email service is temporarily unavailable (daily sending limit reached). Please try again later.",
      });
    }

    res.status(500).json({ message: "We couldn't send the verification email. Please try again in a moment." });
  }
};

// -------------------- VERIFY SIGNUP OTP --------------------
export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp, password, referralCode } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and code are required." });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ field: "password", message: pwErr });

    const normalizedEmail = email.trim().toLowerCase();
    const record = await SignupOtp.findOne({ email: normalizedEmail });

    if (!record)
      return res.status(400).json({ message: "No code found. Please request a new one." });

    if (Date.now() > record.expiresAt.getTime()) {
      await SignupOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }

    if (record.attempts >= 5) {
      await SignupOtp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many incorrect attempts. Please request a new code." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    if (hashedOtp !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    // Code is correct. The SERVER creates the account from here - the browser
    // never calls createUserWithEmailAndPassword. That is what makes email
    // verification an actual guarantee rather than a client-side formality:
    // no code path can produce an account without first proving the inbox.
    // `emailVerified: true` is honest here - the OTP just proved it - and it
    // is what lets authMiddleware provision this user later.
    let fbUser;
    try {
      fbUser = await admin.auth().createUser({
        email: normalizedEmail,
        password,
        // Codes issued before `name` was added to the model won't carry one;
        // they stay valid for their 10-minute TTL after this deploys, and
        // createUser rejects a non-string displayName.
        displayName: record.name || normalizedEmail.split("@")[0],
        emailVerified: true,
      });
    } catch (fbErr) {
      if (fbErr.code === "auth/email-already-exists") {
        await SignupOtp.deleteOne({ _id: record._id });
        return res.status(400).json({
          field: "email",
          message: "An account with this email already exists. Please sign in instead.",
        });
      }
      throw fbErr;
    }

    // Consume the code only once the account really exists, so a failure above
    // leaves the user able to retry with the code they already have.
    await SignupOtp.deleteOne({ _id: record._id });

    const { user } = await findOrCreateUser({
      uid: fbUser.uid,
      email: normalizedEmail,
      name: record.name,
    });

    // Mirror the password hash the way resetPassword and login expect to find it.
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

    if (referralCode && !user.referredBy) {
      await attributeReferral(user, referralCode);
    }
    await recordActiveDay(user);

    // A custom token lets the client sign in as this brand-new user without
    // ever having created it itself.
    const customToken = await admin.auth().createCustomToken(fbUser.uid);

    res.status(201).json({ verified: true, customToken, user });
  } catch (err) {
    console.error("Verify Signup OTP Error:", err);
    res.status(500).json({ message: "We couldn't finish creating your account. Please try again." });
  }
};

// -------------------- EMAIL + PASSWORD LOGIN --------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email))
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    if (!password)
      return res.status(400).json({ field: "password", message: "Password is required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // No JWT - client authenticates via Firebase ID token.
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- GOOGLE LOGIN --------------------
export const googleLogin = async (req, res) => {
  try {
    const { token, referralCode } = req.body;
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name, picture, email_verified: emailVerified } = decoded;

    // Atomic upsert - prevents duplicate user creation under concurrent requests.
    // Gated on a verified email for the same reason as authMiddleware: this
    // endpoint accepts any valid Firebase token, so without the gate an account
    // created directly against the Firebase API could provision itself here and
    // skip the signup OTP. Real Google sign-ins are always verified.
    const { user, isNew } = await findOrCreateUser({
      uid,
      email,
      name,
      picture,
      allowCreate: emailVerified === true,
    });

    if (!user) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before using SplitEase.",
      });
    }

    // Attribution applies at signup, but `isNew` alone is unreliable: a
    // parallel authenticated request can hit authMiddleware first and create
    // the user there, making isNew false on the actual signup call - and the
    // attribution would be lost forever. So also accept still-unattributed
    // accounts created within the attribution window.
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    const withinWindow = accountAgeMs < ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000;
    if (referralCode && !user.referredBy && (isNew || withinWindow)) {
      await attributeReferral(user, referralCode);
    }

    await recordActiveDay(user);

    res.status(200).json({ user });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- SEND LOGIN OTP --------------------
export const sendLoginOtp = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email))
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    if (!password)
      return res.status(400).json({ field: "password", message: "Password is required." });

    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(400).json({ message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password." });

    // This is deliberately a per-user database setting. It lets explicitly
    // provisioned accounts sign in without weakening OTP for everyone else.
    const hasTemporaryOtpBypass =
      user.loginOtpBypassExpires && user.loginOtpBypassExpires > new Date();
    if (user.skipLoginOtp || hasTemporaryOtpBypass) {
      user.loginOtp = null;
      user.loginOtpExpires = null;
      // Temporary bypasses are one-time. The permanent flag is reserved for
      // explicitly provisioned service/test users.
      user.loginOtpBypassExpires = null;
      await user.save();
      return res.status(200).json({ requiresOtp: false });
    }

    // Throttle: block re-send if an OTP was issued < 60 s ago
    if (user.loginOtpExpires && user.loginOtpExpires - Date.now() > 9 * 60 * 1000)
      return res.status(429).json({ message: "An OTP was just sent. Please wait a moment before requesting another." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.loginOtp = hashedOtp;
    user.loginOtpExpires = Date.now() + 10 * 60 * 1000;
    user.loginOtpAttempts = 0;
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0];
    const logoUrl = `${frontendUrl}/logo-icon.png`;

    await sendEmail({
      to: email,
      subject: "Your SplitEase Login Verification Code",
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06101C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06101C;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0B1A2B;border-radius:20px;overflow:hidden;border:1px solid rgba(8,145,178,0.15);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A2540 0%,#0D2E50 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(8,145,178,0.2);">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <img src="${logoUrl}" alt="SplitEase" width="44" height="44" style="border-radius:12px;border:1px solid rgba(8,145,178,0.3);display:block;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SplitEase</span>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:rgba(8,145,178,0.8);letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">Login Verification</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hi <strong style="color:#e2e8f0;">${user.name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
              Use the verification code below to complete your login to SplitEase. This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 28px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,rgba(8,145,178,0.12),rgba(14,116,144,0.08));border:1.5px solid rgba(8,145,178,0.35);border-radius:16px;padding:24px 48px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(8,145,178,0.7);letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
                    <p style="margin:0;font-size:42px;font-weight:800;color:#ffffff;letter-spacing:10px;font-variant-numeric:tabular-nums;">${otp}</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Tips -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#475569;">• This code is valid for <strong style="color:#94a3b8;">10 minutes</strong> only.</p>
                  <p style="margin:0 0 6px;font-size:12px;color:#475569;">• Never share this code with anyone.</p>
                  <p style="margin:0;font-size:12px;color:#475569;">• If you didn't try to log in, <strong style="color:#f87171;">ignore this email</strong> and secure your account.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#1e3a4f;">© ${new Date().getFullYear()} SplitEase · Secure Login</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    res.status(200).json({
      requiresOtp: true,
      message: "OTP sent to your registered email.",
    });
  } catch (err) {
    console.error("Send Login OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- VERIFY LOGIN OTP --------------------
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found." });

    if (!user.loginOtp || !user.loginOtpExpires)
      return res.status(400).json({ message: "No OTP found. Please start the login process again." });

    if (Date.now() > user.loginOtpExpires) {
      user.loginOtp = null;
      user.loginOtpExpires = null;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if ((user.loginOtpAttempts || 0) >= 5) {
      user.loginOtp = null;
      user.loginOtpExpires = null;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ message: "Too many incorrect attempts. Please request a new code." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    if (hashedOtp !== user.loginOtp) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });
    }

    user.loginOtp = null;
    user.loginOtpExpires = null;
    user.loginOtpAttempts = 0;
    await user.save();

    res.status(200).json({ message: "OTP verified. Proceed with login." });
  } catch (err) {
    console.error("Verify Login OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- FORGOT PASSWORD --------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim())
      return res.status(400).json({ field: "forgotEmail", message: "Email address is required." });
    if (!isValidEmail(email))
      return res.status(400).json({ field: "forgotEmail", message: "Please enter a valid email address." });

    const user = await User.findOne({ email });

    // Always return the same response to avoid leaking whether email exists
    if (!user) {
      return res.status(200).json({ message: "If this email exists, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0];
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Reset your SplitEase password",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d0d18;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">SplitEase</h1>
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Password Reset Request</p>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">Hi ${user.name},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
              We received a request to reset your SplitEase password. Click the button below - this link expires in <strong style="color:#e2e8f0;">15 minutes</strong>.
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.3px;">
                Reset Password
              </a>
            </div>
            <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
              If you didn't request this, you can safely ignore this email. Your password will not change.
            </p>
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- RESET PASSWORD --------------------
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token)
      return res.status(400).json({ message: "Reset token is required." });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ field: "password", message: pwErr });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    // Hash and save in MongoDB
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Synchronize with Firebase Auth if firebaseUid is present
    if (user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, {
          password: password,
        });
        console.log(`✅ Synced password update to Firebase for UID: ${user.firebaseUid}`);
      } catch (fbErr) {
        console.error("⚠️ Failed to update password in Firebase Auth:", fbErr.message);
      }
    }

    res.status(200).json({ message: "Password has been successfully reset!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};
