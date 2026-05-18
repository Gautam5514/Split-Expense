import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: false }, // For Google/Firebase users
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for Firebase users
  photoURL: { type: String, default: "" },
  expoPushTokens: [
    {
      token: { type: String, required: true },
      platform: { type: String, enum: ["ios", "android"], required: true },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  hiddenDirectChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  hiddenGroupChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
