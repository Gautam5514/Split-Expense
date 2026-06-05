import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Find all conversations a user is part of, sorted by most recent activity
conversationSchema.index({ members: 1, lastMessageAt: -1 });

export default mongoose.model("Conversation", conversationSchema);
