import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: false }, // For Google/Firebase users
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for Firebase users
  photoURL: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
