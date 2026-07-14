import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { isValidEmail } from "../middleware/validate.js";

const readArg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const email = (readArg("email") || "").trim().toLowerCase();
const minutes = Number.parseInt(readArg("minutes") || "15", 10);

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not configured.");
  process.exitCode = 1;
} else if (!isValidEmail(email)) {
  console.error("Provide a valid existing user email with --email.");
  process.exitCode = 1;
} else if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
  console.error("--minutes must be between 1 and 60.");
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          loginOtpBypassExpires: new Date(Date.now() + minutes * 60 * 1000),
          loginOtp: null,
          loginOtpExpires: null,
        },
      },
      { new: true }
    );

    if (!user) throw new Error(`No MongoDB user exists for ${email}.`);
    console.log(`One-time OTP bypass enabled for ${email} for ${minutes} minutes.`);
  } catch (error) {
    console.error(`Update failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
