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

export default mongoose.model("AiMessage", aiMessageSchema);
