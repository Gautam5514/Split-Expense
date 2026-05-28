import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { io, onlineUsers } from "../index.js";
import admin from "../config/firebaseAdmin.js";


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

    const pushPayload = {
      title: notificationTitleForType(type),
      body: message,
      data: { link, type },
    };

    // 📱 Dispatch Expo push alerts (mobile apps)
    await sendExpoPushNotifications(recipientIds, pushPayload);

    // 🌐 Dispatch FCM web push (browser / PWA)
    await sendFCMWebPushNotifications(recipientIds, pushPayload);

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

// ─── FCM Web Push ────────────────────────────────────────────────────────────

export const registerWebPushToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ message: "Invalid FCM token" });
    }

    // Remove this token from any other user (device token reassignment)
    await User.updateMany(
      { webPushTokens: fcmToken },
      { $pull: { webPushTokens: fcmToken } }
    );

    // Add to this user if not already present
    await User.findByIdAndUpdate(uid, {
      $addToSet: { webPushTokens: fcmToken },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ registerWebPushToken:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const unregisterWebPushToken = async (req, res) => {
  try {
    const uid = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ message: "Invalid FCM token" });
    }

    await User.findByIdAndUpdate(uid, {
      $pull: { webPushTokens: fcmToken },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ unregisterWebPushToken:", err.message);
    res.status(500).json({ message: err.message });
  }
};

const sendFCMWebPushNotifications = async (userIds, payload) => {
  const users = await User.find(
    { _id: { $in: userIds }, webPushTokens: { $exists: true, $not: { $size: 0 } } },
    "webPushTokens"
  ).lean();

  const tokens = users.flatMap((u) => u.webPushTokens || []);
  if (!tokens.length) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    // FCM requires every data value to be a string.
    data: {
      link: String(payload.data?.link || "/dashboard"),
      type: String(payload.data?.type || "group"),
    },
    webpush: {
      notification: {
        icon: "/logo-icon.png",
        badge: "/logo-icon.png",
        requireInteraction: false,
      },
      fcmOptions: {
        link: payload.data?.link || "/dashboard",
      },
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      const staleTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            staleTokens.push(tokens[idx]);
          }
        }
      });

      if (staleTokens.length) {
        await User.updateMany(
          { webPushTokens: { $in: staleTokens } },
          { $pull: { webPushTokens: { $in: staleTokens } } }
        );
      }
    }
  } catch (err) {
    console.error("❌ FCM web push error:", err.message);
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

    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: uid },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

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


