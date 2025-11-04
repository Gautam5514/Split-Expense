import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import { io, onlineUsers } from "../index.js";

/**
 * 🔔 Create notifications for multiple users and emit them in real time
 */
export const createNotification = async (userIds, message, link, type = "group") => {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      message,
      link,
      type,
    }));

    // Store all notifications in MongoDB
    await Notification.insertMany(notifications);

    // 🔥 Emit to online users immediately
    userIds.forEach((userId) => {
      const socketId = onlineUsers.get(String(userId));
      if (socketId) {
        io.to(socketId).emit("notification", {
          message,
          link,
          type,
          createdAt: new Date(),
        });
      }
    });
  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
  }
};

/**
 * 📩 Fetch latest notifications for logged-in user
 */
export const getUserNotifications = async (req, res) => {
  try {
    const uid = req.user.id;

    // ✅ Only fetch unread notifications
    const notifications = await Notification.find({
      userId: uid,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ Mark all unread notifications as read (used when dropdown opened)
 */
export const markAllAsRead = async (req, res) => {
  try {
    const uid = req.user.id;
    const result = await Notification.updateMany(
      { userId: uid, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (err) {
    console.error("❌ markAllAsRead:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Mark a single notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const uid = req.user?.id;
    const { id } = req.params;

    console.log("📩 markNotificationAsRead called with:", { uid, id });

    // 🧩 Validate IDs
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      console.log("❌ Invalid user ID:", uid);
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Invalid notification ID:", id);
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    // 🧩 Try to mark it as read
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: uid },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      console.log("⚠️ Notification not found or not owned by user:", { id, uid });
      return res.status(404).json({ message: "Notification not found or not owned by user" });
    }

    console.log("✅ Notification marked as read:", notif._id);
    res.json({ success: true, notification: notif });

  } catch (err) {
    console.error("❌ markNotificationAsRead error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};



/**
 * 🧹 Optional: Delete old read notifications (cleanup)
 */
export const cleanupOldNotifications = async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // older than 30 days
    await Notification.deleteMany({ isRead: true, createdAt: { $lt: cutoff } });
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  }
};
