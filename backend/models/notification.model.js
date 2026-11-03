import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  link: { type: String, default: "" }, // e.g. `/groups/12345`
  type: { type: String, enum: ["group", "expense", "settlement", "promo"], default: "group" },
  // Engagement cards only. Older clients ignore these and show `message` + `link`.
  title: { type: String, default: undefined },
  image: { type: String, default: undefined },
  cta: { type: { label: String, link: String }, default: undefined, _id: false },
  campaign: { type: String, default: undefined },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Fetch unread notifications for a user, sorted by newest first
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// Deleting a group removes its notifications by link; without this that scans every notification.
notificationSchema.index({ link: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
