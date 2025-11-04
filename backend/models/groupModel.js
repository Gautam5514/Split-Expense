import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isCompleted: { type: Boolean, default: false},
  },
  { timestamps: true }
);

// optional: avoid dup groups per creator
groupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export default mongoose.model("Group", groupSchema);
