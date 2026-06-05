import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, default: null },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Fetch group messages sorted by newest first
groupMessageSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model("GroupMessage", groupMessageSchema);
