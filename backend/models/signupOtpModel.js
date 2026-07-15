import mongoose from "mongoose";

// Holds a pending signup email-verification code. The real User/Firebase
// account is NOT created until the code is verified, so dummy/duplicate emails
// never become accounts. Records auto-expire via a TTL index on `expiresAt`.
const signupOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Captured when the code is sent so account creation uses the name that was
  // actually verified, rather than trusting whatever the client posts back.
  name: { type: String, required: true, trim: true },
  otpHash: { type: String, required: true },
  // Guards against brute-forcing the 6-digit code.
  attempts: { type: Number, default: 0 },
  // When the code was last (re)sent - used to throttle resends.
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index: Mongo removes the document once expiresAt passes.
signupOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("SignupOtp", signupOtpSchema);
