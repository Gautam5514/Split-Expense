import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { io, onlineUsers } from "../index.js";
import admin from "../config/firebaseAdmin.js";


/**
 * 🔔 Create notifications for multiple users, emit them in real time, and send push
 *
 * `meta` lets callers hand over the extra context (group name, amount, expense
 * category, settlement outcome) needed to build a rich, "production level"
 * push notification instead of a generic "SplitEase" banner. It's optional —
 * omitting it just falls back to a plain title.
 */
export const createNotification = async (userIds, message, link, type = "group", meta = {}) => {
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

    const data = { link, type, groupId: meta.groupId ? String(meta.groupId) : undefined };

    // 📱 Dispatch Expo push alerts (mobile app only) - rich, emoji/context-aware
    // title + subtitle + per-type channel. Scoped to the app on purpose: web
    // push already works fine and isn't part of this change.
    const { title: mobileTitle, subtitle, channelId } = buildPushContent(type, meta);
    await sendExpoPushNotifications(recipientIds, {
      title: mobileTitle,
      subtitle,
      body: message,
      data,
      channelId,
    });

    // 🌐 Dispatch FCM web push (browser / PWA) - unchanged, plain title as before.
    await sendFCMWebPushNotifications(recipientIds, {
      title: notificationTitleForType(type),
      body: message,
      data,
    });

  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
  }
};

/**
 * 📲 Push-only dispatch (Expo mobile + FCM web) with no DB record and no
 * socket emit — used for chat messages, which have their own unread counters
 * and would flood the notification bell if stored.
 */
// Types that don't go through createNotification (chat messages) don't carry
// an explicit channelId - infer one from `data.type` so they still land on a
// sensible Android channel instead of the catch-all "alerts" one.
const CHANNEL_BY_TYPE = {
  chat: "chat",
  "group-chat": "chat",
  expense: "expenses",
  settlement: "settlements",
  group: "groups",
};

export const sendPushToUsers = async (userIds, payload) => {
  try {
    const recipientIds = userIds.map((id) => String(id));
    if (!recipientIds.length) return;
    const withChannel = {
      ...payload,
      channelId: payload.channelId || CHANNEL_BY_TYPE[payload.data?.type] || "alerts",
    };
    await sendExpoPushNotifications(recipientIds, withChannel);
    await sendFCMWebPushNotifications(recipientIds, withChannel);
  } catch (err) {
    console.error("❌ sendPushToUsers:", err.message);
  }
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

const isValidExpoPushToken = (token) =>
  typeof token === "string" &&
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);

// Plain title used for the web/FCM push only - kept exactly as it was before
// the app-side notification redesign, since web notifications weren't part
// of this change and should stay untouched.
export const notificationTitleForType = (type) => {
  switch (type) {
    case "expense":
      return "New expense";
    case "settlement":
      return "Settlement update";
    case "group":
    default:
      return "SplitEase";
  }
};

// Category → emoji so an expense push instantly signals what kind of spend
// it is, the same way Splitwise/production apps do, without needing to open
// the app first.
const CATEGORY_EMOJI = {
  general: "💳",
  food: "🍔",
  travel: "✈️",
  stay: "🏨",
  shopping: "🛍️",
  bills: "🧾",
};

// Settlement notifications share one `type` but mean very different things
// (a claim vs. a confirmation vs. a dispute) - `meta.kind` disambiguates so
// the push can lead with the right verb/emoji instead of a generic banner.
const SETTLEMENT_COPY = {
  requested: { emoji: "💸", label: "Payment claim" },
  confirmed: { emoji: "✅", label: "Settlement confirmed" },
  rejected: { emoji: "⚠️", label: "Settlement disputed" },
  cancelled: { emoji: "🚫", label: "Settlement cancelled" },
};

/**
 * Build a rich, contextual { title, subtitle, channelId } for a push
 * notification from its `type` + optional `meta` (groupName, amount,
 * category, kind). Falls back gracefully when meta is missing so every
 * existing call site keeps working unchanged.
 */
export const buildPushContent = (type, meta = {}) => {
  const { groupName, amount, category, kind } = meta;
  const amountLabel = amount != null && !Number.isNaN(Number(amount))
    ? `₹${Number(amount).toFixed(0)}`
    : undefined;

  switch (type) {
    case "expense": {
      const emoji = CATEGORY_EMOJI[category] || "💳";
      return {
        title: groupName ? `${emoji} New expense · ${groupName}` : `${emoji} New expense`,
        subtitle: amountLabel,
        channelId: "expenses",
      };
    }
    case "settlement": {
      const { emoji, label } = SETTLEMENT_COPY[kind] || { emoji: "💰", label: "Settlement update" };
      return {
        title: groupName ? `${emoji} ${label} · ${groupName}` : `${emoji} ${label}`,
        subtitle: amountLabel,
        channelId: "settlements",
      };
    }
    case "group":
    default:
      return {
        title: groupName ? `👥 ${groupName}` : "SplitEase",
        subtitle: undefined,
        channelId: "groups",
      };
  }
};

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Real-time badge count per recipient - so the app icon shows the correct
// unread number the instant a push lands, even if the app has been backgrounded
// for days and never had a chance to recompute it locally.
const getUnreadCounts = async (userIds) => {
  const objectIds = userIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return new Map();

  const rows = await Notification.aggregate([
    { $match: { userId: { $in: objectIds }, isRead: false } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);

  const map = new Map();
  rows.forEach((r) => map.set(String(r._id), r.count));
  return map;
};

const sendExpoPushNotifications = async (userIds, payload) => {
  const users = await User.find(
    { _id: { $in: userIds } },
    "expoPushTokens"
  ).lean();

  const badgeByUser = await getUnreadCounts(userIds);

  const messages = users.flatMap((user) => {
    const badge = badgeByUser.get(String(user._id)) ?? 0;
    return (user.expoPushTokens || [])
      .filter(({ token }) => isValidExpoPushToken(token))
      .map(({ token, platform }) => ({
        to: token,
        // iOS plays this file directly; Android ignores it and instead uses
        // the channel's own sound (set client-side in registerForPushNotificationsAsync).
        sound: "notification.wav",
        title: payload.title,
        ...(payload.subtitle && { subtitle: payload.subtitle }),
        body: payload.body,
        data: payload.data,
        badge,
        ...(platform === "android" && {
          // Route each notification type to its own channel (created client-side
          // in lib/pushNotifications.js) so users can mute e.g. chat pushes
          // without losing expense/settlement alerts - a real production pattern.
          channelId: payload.channelId || "alerts",
          priority: "high",
        }),
      }));
  });

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

// Pick the first HTTPS origin from FRONTEND_URL for FCM absolute links.
// FCM silently drops push delivery when fcmOptions.link is a relative path.
const HTTPS_ORIGIN = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((u) => u.trim())
  .find((u) => u.startsWith("https://")) || "";

const sendFCMWebPushNotifications = async (userIds, payload) => {
  const users = await User.find(
    { _id: { $in: userIds }, webPushTokens: { $exists: true, $not: { $size: 0 } } },
    "webPushTokens"
  ).lean();

  const tokens = users.flatMap((u) => u.webPushTokens || []);
  if (!tokens.length) {
    console.log("📭 FCM web push: no registered tokens for these users");
    return;
  }

  const relLink = String(payload.data?.link || "/dashboard");
  const type    = String(payload.data?.type  || "group");

  // FCM requires fcmOptions.link to be an absolute HTTPS URL.
  // Relative paths cause silent delivery failure (0 received despite successful send).
  const absLink = HTTPS_ORIGIN
    ? `${HTTPS_ORIGIN}${relLink.startsWith("/") ? relLink : `/${relLink}`}`
    : relLink;

  // Data-only message: omitting the `notification` field prevents FCM from
  // auto-displaying a system notification. The service worker's onBackgroundMessage
  // handler shows exactly one notification with full icon/vibrate/click control.
  // Sending both `notification` + `data` causes two notifications to appear.
  const message = {
    data: {
      title: payload.title,
      body:  payload.body,
      link:  relLink,
      type,
      ...(payload.data?.groupId && { groupId: String(payload.data.groupId) }),
    },
    webpush: {
      ...(absLink && { fcmOptions: { link: absLink } }),
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `📱 FCM web push: ${response.successCount} sent, ${response.failureCount} failed (${tokens.length} tokens)`
    );

    if (response.failureCount > 0) {
      const staleTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          console.error(`❌ FCM token[${idx}] failed: ${code} - ${resp.error?.message}`);
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
        console.log(`🧹 Removed ${staleTokens.length} stale FCM token(s)`);
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


