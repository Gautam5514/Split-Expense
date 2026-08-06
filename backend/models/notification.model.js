import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  link: { type: String, default: "" }, // e.g. `/groups/12345`
  type: { type: String, enum: ["group", "expense", "settlement"], default: "group" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Fetch unread notifications for a user, sorted by newest first
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
