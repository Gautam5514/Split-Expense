import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
import { isValidEmail, validatePassword } from "../middleware/validate.js";
import { ensureReferralCode } from "../utils/referralService.js";

const readArg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const email = (readArg("email") || process.env.SEED_USER_EMAIL || "").trim().toLowerCase();
const password = readArg("password") || process.env.SEED_USER_PASSWORD || "";
const name = (readArg("name") || process.env.SEED_USER_NAME || email.split("@")[0] || "Seed User").trim();

const fail = (message) => {
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
};

if (!process.env.MONGO_URI) {
  fail("MONGO_URI is not configured.");
} else if (!isValidEmail(email)) {
  fail("Provide a valid email with --email or SEED_USER_EMAIL.");
} else if (validatePassword(password)) {
  fail(validatePassword(password));
} else if (name.length < 2 || name.length > 100) {
  fail("Name must be between 2 and 100 characters.");
} else {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      firebaseUser = await admin.auth().updateUser(firebaseUser.uid, {
        password,
        displayName: name,
        disabled: false,
        emailVerified: true,
      });
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          firebaseUid: firebaseUser.uid,
          password: hashedPassword,
          skipLoginOtp: true,
          loginOtp: null,
          loginOtpExpires: null,
        },
        $setOnInsert: { email },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!user.referralCode) await ensureReferralCode(user._id);

    console.log(`Seeded ${email} (MongoDB id: ${user._id}, OTP bypass: enabled).`);
  } catch (error) {
    fail(error.message);
  } finally {
    await mongoose.disconnect();
  }
}
