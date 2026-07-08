import mongoose from "mongoose";

const aiMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
    topic: { type: String, default: "general" }, // could store 'trip', 'expense', etc.
    provider: { type: String, enum: ["gemini", "openai", "smart"], default: "gemini" },
  },
  { timestamps: true }
);

// Fetch AI chat history for a user sorted by newest first
aiMessageSchema.index({ userId: 1, createdAt: -1 });

// Privacy: auto-delete AI chat messages 24 hours after creation — nothing is
// retained past a single day, on either the client or the server.
aiMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.model("AiMessage", aiMessageSchema);
