import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: "" },
  subject: {
    type: String,
    enum: ["general", "support", "billing", "partnership", "feedback", "bug"],
    default: "general",
  },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ["new", "read", "resolved"], default: "new" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ContactMessage", contactMessageSchema);
