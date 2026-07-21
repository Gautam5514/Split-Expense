import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../models/adminModel.js";

// Usage: node scripts/seed-admin.js [--email gautam@admin] [--password gautam]
// Defaults match the one admin account this app ships with.
const readArg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const email = (readArg("email") || process.env.SEED_ADMIN_EMAIL || "gautam@admin").trim().toLowerCase();
const password = readArg("password") || process.env.SEED_ADMIN_PASSWORD || "gautam";

const fail = (message) => {
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
};

if (!process.env.MONGO_URI) {
  fail("MONGO_URI is not configured.");
} else if (!email || !password) {
  fail("Both --email and --password are required.");
} else {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.findOneAndUpdate(
      { email },
      { $set: { password: hashedPassword } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Seeded admin ${email} (id: ${admin._id}).`);
  } catch (error) {
    fail(error.message);
  } finally {
    await mongoose.disconnect();
  }
}
