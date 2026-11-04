import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { io, onlineUsers } from "../index.js";
import admin from "../config/firebaseAdmin.js";
import { RULES } from "../modules/engagement/config.js";


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
    // Expo (mobile) and FCM (web) are independent - send them together.
    // allSettled so one channel failing never blocks or hides the other.
    await Promise.allSettled([
      sendExpoPushNotifications(recipientIds, {
        title: mobileTitle,
        subtitle,
        body: message,
        data,
        channelId,
      }),
      // 🌐 FCM web push (browser / PWA) - unchanged, plain title as before.
      sendFCMWebPushNotifications(recipientIds, {
        title: notificationTitleForType(type),
        body: message,
        data,
      }),
    ]);

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
    // Tips and reminders never inflate the app icon badge.
    { $match: { userId: { $in: objectIds }, isRead: false, type: { $ne: "promo" } } },
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
    // De-dupe by token so an already-duplicated DB entry (pre-existing from
    // before the registerPushToken race fix, or any future edge case) can
    // never result in the same device getting the same push twice.
    const uniqueTokens = Array.from(
      new Map((user.expoPushTokens || []).map((t) => [t.token, t])).values()
    );
    return uniqueTokens
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
        signal: AbortSignal.timeout(15_000), // don't hang on a stalled Expo call
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

    // Strip this token from any other user who previously held it (device
    // reassigned after logging out and into a different account).
    await User.updateMany(
      { _id: { $ne: uid }, "expoPushTokens.token": expoPushToken },
      { $pull: { expoPushTokens: { token: expoPushToken } } }
    );

    // Single atomic pipeline update: drop any existing entry for this token on
    // this user, then append the fresh one, in one document-level write. Two
    // near-simultaneous registrations for the same device (a real race on
    // cold start, when multiple components sync the token at once) can no
    // longer both survive as duplicate entries — each write is serialized
    // against the latest document state, so the second call sees the first's
    // result and replaces rather than duplicates it.
    await User.updateOne({ _id: uid }, [
      {
        $set: {
          expoPushTokens: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ["$expoPushTokens", []] },
                  cond: { $ne: ["$$this.token", expoPushToken] },
                },
              },
              [{ token: expoPushToken, platform, updatedAt: new Date() }],
            ],
          },
        },
      },
    ]);

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

    if (!fcmToken || typeof fcmToken !== "string" || fcmToken.length > 4096) {
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
 * 📣 Engagement campaigns (monthly reminder, weekend nudge, trip ideas).
 *
 * Unlike createNotification every recipient gets their own copy (name, nearby
 * destination), so messages are built per user. Each item:
 *   { userId, title, body, image?, appLink, webLink, cta, campaign }
 * - Bell: stored as type "promo" with `link: "/dashboard"`, which every app and
 *   web build can open; the real call-to-action rides in `cta` for new clients.
 * - App: Expo push with a big picture on Android and a TTL, so a stale nudge is
 *   dropped instead of arriving late. Dead tokens are pruned from Expo's tickets.
 * - Web: one FCM message per token (chunked at 500) with image + action buttons.
 */
export const sendEngagementNotifications = async (items) => {
  if (!items.length) return { stored: 0 };
  const saved = await Notification.insertMany(items.map((it) => ({
    userId: it.userId, type: "promo", message: it.body, title: it.title, image: it.image || undefined,
    // Nudges about one group open that group; everything else opens the dashboard (or Autopilot via cta.link).
    link: /^\/groups\/[a-f0-9]{24}$/.test(it.webLink || "") ? it.webLink : "/dashboard", cta: { label: it.cta, link: it.webLink }, campaign: it.campaign,
  })));
  saved.forEach((doc) => {
    const socketId = onlineUsers.get(String(doc.userId));
    if (socketId) io.to(socketId).emit("notification", doc);
  });
  const byUser = new Map(items.map((it, i) => [String(it.userId), { ...it, notificationId: String(saved[i]._id) }]));
  const users = await User.find({ _id: { $in: [...byUser.keys()] } }, "expoPushTokens webPushTokens").lean();
  await Promise.allSettled([sendEngagementExpo(users, byUser), sendEngagementWeb(users, byUser)]);
  return { stored: saved.length };
};

const ENGAGEMENT_TTL_SECONDS = RULES.pushTtlSeconds;
const absoluteUrl = (path) => (HTTPS_ORIGIN && path ? `${HTTPS_ORIGIN}${path.startsWith("/") ? path : `/${path}`}` : "");

// A device token can sit on two accounts (old data) or be stored twice; each device gets
// one tip per run, and only a person's most recent devices are used. O(1) per token.
const MAX_DEVICES = 10;
const sendEngagementExpo = async (users, byUser) => {
  const seen = new Set();
  const messages = users.flatMap((user) => {
    const it = byUser.get(String(user._id));
    const tokens = [...(user.expoPushTokens || [])]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .filter(({ token }) => isValidExpoPushToken(token) && !seen.has(token) && seen.add(token))
      .slice(0, MAX_DEVICES);
    return tokens.map(({ token, platform }) => ({
      to: token,
      title: it.title,
      body: it.body,
      // `prompt`: newer app builds open Autopilot with this draft; older ones follow `link`.
      data: { link: it.appLink, type: "promo", campaign: it.campaign, notificationId: it.notificationId, ...(it.prompt && { prompt: it.prompt }), ...(it.groupId && { groupId: String(it.groupId) }) },
      ttl: ENGAGEMENT_TTL_SECONDS,
      ...(it.image && { richContent: { image: it.image } }),
      // A channel the device lacks would hide the push entirely, so this uses one every live build has.
      ...(platform === "android" && { channelId: RULES.androidChannel, priority: "normal" }),
    }));
  });
  const dead = [];
  for (const batch of chunk(messages, 100)) {
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) { console.error("❌ Engagement Expo push failed:", res.status); continue; }
      const { data = [] } = await res.json().catch(() => ({}));
      data.forEach((ticket, i) => { if (ticket?.details?.error === "DeviceNotRegistered") dead.push(batch[i].to); });
    } catch (err) {
      console.error("❌ Engagement Expo push error:", err.message);
    }
  }
  if (dead.length) await User.updateMany({ "expoPushTokens.token": { $in: dead } }, { $pull: { expoPushTokens: { token: { $in: dead } } } });
};

const sendEngagementWeb = async (users, byUser) => {
  const seen = new Set();
  const messages = users.flatMap((user) => {
    const it = byUser.get(String(user._id));
    const link = absoluteUrl(it.webLink);
    // Newest tokens are appended last.
    const tokens = (user.webPushTokens || []).filter((t) => typeof t === "string" && t && !seen.has(t) && seen.add(t)).slice(-MAX_DEVICES);
    return tokens.map((token) => ({
      token,
      data: {
        title: it.title, body: it.body, link: it.webLink, type: "promo",
        ...(it.image && { image: it.image }), cta: it.cta || "", campaign: it.campaign || "", notificationId: it.notificationId,
      },
      webpush: { headers: { TTL: String(ENGAGEMENT_TTL_SECONDS), Urgency: "low" }, ...(link && { fcmOptions: { link } }) },
    }));
  });
  const stale = [];
  for (const batch of chunk(messages, 500)) {
    try {
      const response = await admin.messaging().sendEach(batch);
      response.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered") stale.push(batch[i].token);
      });
    } catch (err) {
      console.error("❌ Engagement web push error:", err.message);
    }
  }
  if (stale.length) await User.updateMany({ webPushTokens: { $in: stale } }, { $pull: { webPushTokens: { $in: stale } } });
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


