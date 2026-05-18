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

  profession: {
    type: String,
    enum: [
      "Student",
      "Working Professional",
      "Freelancer",
      "Entrepreneur",
      "Other",
    ],
  },

  timezone: String,
  bio: String,
  interests: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("UserProfile", userProfileSchema);
