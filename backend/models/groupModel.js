import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isCompleted: { type: Boolean, default: false},
    inviteCode: { type: String, unique: true, sparse: true },
    groupType: { type: String, enum: ["trip", "roommate", "general"], default: "trip" },
  },
  { timestamps: true }
);

// Deduplicate members array on every save
groupSchema.pre("save", function (next) {
  if (this.isModified("members")) {
    const seen = new Set();
    this.members = this.members.filter((id) => {
      const key = id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  next();
});

// optional: avoid dup groups per creator
groupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export default mongoose.model("Group", groupSchema);
