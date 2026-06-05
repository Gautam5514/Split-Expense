import mongoose from "mongoose";

const aiMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
    topic: { type: String, default: "general" }, // could store 'trip', 'expense', etc.
  },
  { timestamps: true }
);

// Fetch AI chat history for a user sorted by newest first
aiMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("AiMessage", aiMessageSchema);
