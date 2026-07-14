import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // 🖼️ Profile image info
  profileImage: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" },
  },

  // other optional fields
  mobile: String,
  address: String,
  city: String,
  state: String,
  favoritePlace: String,

  // Free text: the profile form takes this as a plain input (e.g. "Software
  // Engineer"), so it must not be restricted to a fixed enum - an off-list
  // value would throw a validation error and fail the entire profile save.
  profession: { type: String },

  timezone: String,
  bio: String,
  interests: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("UserProfile", userProfileSchema);
