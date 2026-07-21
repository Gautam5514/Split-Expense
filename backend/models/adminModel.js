import mongoose from "mongoose";

// Single-admin model: email is intentionally not validated as a real email
// address (the admin login is a separate, non-Firebase credential store).
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // bcrypt hash
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Admin", adminSchema);
