import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { io, onlineUsers } from "../index.js";
import admin from "../config/firebaseAdmin.js";

/**
 * 🚀 Helper to send Firebase Cloud Messaging (FCM) push notifications to multiple users' web browsers
 */
const sendFcmPushNotifications = async (userIds, payload) => {
  try {
    const users = await User.find(
      { _id: { $in: userIds } },
      "webPushTokens"
    ).lean();

    const tokens = users.flatMap(user => user.webPushTokens || []);
    if (!tokens.length) return;

    // Construct multi-cast FCM message
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: payload.data?.type || "group",
        link: payload.data?.link || "",
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`🚀 Sent ${response.successCount} Web Push notifications successfully (${response.failureCount} failed).`);

    // Clean up expired/invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await User.updateMany(
          { webPushTokens: { $in: tokensToRemove } },
          { $pull: { webPushTokens: { $in: tokensToRemove } } }
        );
        console.log(`🧹 Cleaned up ${tokensToRemove.length} expired FCM web push tokens.`);
      }
    }
  } catch (error) {
    console.error("❌ Error sending FCM push notifications:", error.message);
  }
};

/**
 * 🔔 Create notifications for multiple users, emit them in real time, and send push
 */
export const createNotification = async (userIds, message, link, type = "group") => {
  try {
    const recipientIds = userIds.map((userId) => String(userId));
    const notifications = userIds.map((userId) => ({
      userId,
      message,
      link,
      type,
    }));

    // Store all notifications in MongoDB
    const savedNotifications = await Notification.insertMany(notifications);

    // 🔥 Emit to online users immediately
    recipientIds.forEach((userId, index) => {
      const socketId = onlineUsers.get(String(userId));
      if (socketId) {
        io.to(socketId).emit("notification", savedNotifications[index]);
      }
    });

    // 📱 Dispatch Expo push alerts (mobile apps)
    await sendExpoPushNotifications(recipientIds, {
      title: notificationTitleForType(type),
      body: message,
      data: { link, type },
    });

    // 🌐 Dispatch FCM push alerts (web browsers)
    await sendFcmPushNotifications(recipientIds, {
      title: notificationTitleForType(type),
      body: message,
      data: { link, type },
    });
  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
  }
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

const isValidExpoPushToken = (token) =>
  typeof token === "string" &&
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);

const notificationTitleForType = (type) => {
  switch (type) {
    case "expense":
      return "New expense";
    case "group":
    default:
      return "SplitEase";
  }
};

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sendExpoPushNotifications = async (userIds, payload) => {
  const users = await User.find(
    { _id: { $in: userIds } },
    "expoPushTokens"
  ).lean();

  const messages = users.flatMap((user) =>
    (user.expoPushTokens || [])
      .filter(({ token }) => isValidExpoPushToken(token))
      .map(({ token, platform }) => ({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data,
        ...(platform === "android" && {
          channelId: "default",
          priority: "high",
        }),
      }))
  );

  if (!messages.length) return;

  for (const messagesChunk of chunk(messages, 100)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagesChunk),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("❌ Expo push failed:", response.status, text);
      }
    } catch (err) {
      console.error("❌ Expo push request error:", err.message);
    }
  }
};

export const registerPushToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { expoPushToken, platform } = req.body;

    if (!isValidExpoPushToken(expoPushToken)) {
      return res.status(400).json({ message: "Invalid Expo push token" });
    }

    if (!["ios", "android"].includes(platform)) {
      return res.status(400).json({ message: "Invalid platform" });
    }

    await User.updateMany(
      { "expoPushTokens.token": expoPushToken },
      { $pull: { expoPushTokens: { token: expoPushToken } } }
    );

    await User.findByIdAndUpdate(uid, {
      $push: {
        expoPushTokens: {
          token: expoPushToken,
          platform,
          updatedAt: new Date(),
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ registerPushToken:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const unregisterPushToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { expoPushToken } = req.body;

    if (!isValidExpoPushToken(expoPushToken)) {
      return res.status(400).json({ message: "Invalid Expo push token" });
    }

    await User.findByIdAndUpdate(uid, {
      $pull: { expoPushTokens: { token: expoPushToken } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ unregisterPushToken:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * 🌐 Register Browser FCM Token
 */
export const registerFcmToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid or missing token" });
    }

    // Pull from any other user to prevent duplicate push deliveries to other users
    await User.updateMany(
      { webPushTokens: token },
      { $pull: { webPushTokens: token } }
    );

    // Save token to the logged-in user
    await User.findByIdAndUpdate(uid, {
      $addToSet: { webPushTokens: token }
    });

    res.json({ success: true, message: "FCM Token registered successfully" });
  } catch (err) {
    console.error("❌ registerFcmToken:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * 🌐 Unregister Browser FCM Token
 */
export const unregisterFcmToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid or missing token" });
    }

    await User.findByIdAndUpdate(uid, {
      $pull: { webPushTokens: token }
    });

    res.json({ success: true, message: "FCM Token unregistered successfully" });
  } catch (err) {
    console.error("❌ unregisterFcmToken:", err.message);
    res.status(500).json({ message: err.message });
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
