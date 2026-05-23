import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { io, onlineUsers } from "../index.js";


/**
 * 🚀 Helper to send OneSignal Web Push notifications to multiple users' browsers
 */
const sendOneSignalPushNotifications = async (userIds, payload) => {
  try {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      console.warn("⚠️ OneSignal Push: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY is not configured.");
      return;
    }

    const users = await User.find(
      { _id: { $in: userIds } },
      "oneSignalSubscriptionIds"
    ).lean();

    const subscriptionIds = users.flatMap(user => user.oneSignalSubscriptionIds || []);
    if (!subscriptionIds.length) {
      console.log("ℹ️ OneSignal Push: No registered subscription IDs found for users.");
      return;
    }

    console.log(`🚀 Sending OneSignal Web Push to ${subscriptionIds.length} subscriptions...`);

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: subscriptionIds,
        headings: {
          en: payload.title
        },
        contents: {
          en: payload.body
        },
        url: payload.data?.link ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}${payload.data.link}` : undefined
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OneSignal Push Error response:", data);
    } else {
      console.log("🚀 OneSignal push notification dispatched successfully:", data);
    }
  } catch (error) {
    console.error("❌ Error sending OneSignal push notifications:", error.message);
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

    // 🌐 Dispatch OneSignal push alerts (web browsers)
    await sendOneSignalPushNotifications(recipientIds, {
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

/**
 * 🌐 Register Browser OneSignal subscription ID
 */
export const registerOneSignalSubscription = async (req, res) => {
  try {
    const uid = req.user.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId || typeof subscriptionId !== "string") {
      return res.status(400).json({ message: "Invalid or missing subscriptionId" });
    }

    // Pull from any other user to prevent duplicate push deliveries to other users
    await User.updateMany(
      { oneSignalSubscriptionIds: subscriptionId },
      { $pull: { oneSignalSubscriptionIds: subscriptionId } }
    );

    // Save subscription ID to the logged-in user
    await User.findByIdAndUpdate(uid, {
      $addToSet: { oneSignalSubscriptionIds: subscriptionId }
    });

    res.json({ success: true, message: "OneSignal subscription saved successfully" });
  } catch (err) {
    console.error("❌ registerOneSignalSubscription:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * 🌐 Unregister Browser OneSignal subscription ID
 */
export const unregisterOneSignalSubscription = async (req, res) => {
  try {
    const uid = req.user.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId || typeof subscriptionId !== "string") {
      return res.status(400).json({ message: "Invalid or missing subscriptionId" });
    }

    await User.findByIdAndUpdate(uid, {
      $pull: { oneSignalSubscriptionIds: subscriptionId }
    });

    res.json({ success: true, message: "OneSignal subscription removed successfully" });
  } catch (err) {
    console.error("❌ unregisterOneSignalSubscription:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * 🌐 Send a direct OneSignal test push notification to the logged-in user
 */
export const sendOneSignalTestNotification = async (req, res) => {
  try {
    const uid = req.user.id;
    const user = await User.findById(uid, "oneSignalSubscriptionIds name").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.oneSignalSubscriptionIds || user.oneSignalSubscriptionIds.length === 0) {
      return res.status(400).json({
        message: "No OneSignal subscription IDs registered for your account. Please enable push notifications on the client first."
      });
    }

    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return res.status(500).json({
        message: "OneSignal credentials are not configured on the server."
      });
    }

    console.log(`🚀 Sending OneSignal Test Push to user ${user.name} (${user.oneSignalSubscriptionIds.length} subscriptions)...`);

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: user.oneSignalSubscriptionIds,
        headings: {
          en: "SplitEase Push Test! 🔔"
        },
        contents: {
          en: `Hey ${user.name || "there"}, your OneSignal push notification setup is working robustly!`
        },
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OneSignal Test Push Error:", data);
      return res.status(500).json({
        success: false,
        message: "OneSignal API returned an error.",
        details: data
      });
    }

    res.json({
      success: true,
      message: `OneSignal test push sent successfully!`,
      details: data,
    });
  } catch (err) {
    console.error("❌ sendOneSignalTestNotification error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};
