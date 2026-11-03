import express from "express";
import mongoose from "mongoose";
import User from "../../models/userModel.js";
import Notification from "../../models/notification.model.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { EngagementSend } from "./models.js";
import { upcomingSlots } from "./schedule.js";
import { RULES } from "./config.js";

const router = express.Router();
const requireOptIn = () => RULES.requireOptIn;
const prefsOf = (user) => {
  const value = user?.notificationPrefs?.engagement;
  return { engagement: requireOptIn() ? value === true : value !== false, decided: typeof value === "boolean", updatedAt: user?.notificationPrefs?.engagementUpdatedAt || null };
};

/* GET /api/users/me/notification-prefs */
router.get("/users/me/notification-prefs", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notificationPrefs").lean();
    const next = upcomingSlots(new Date(), 1, { tripPerMonth: RULES.tripPerMonth })[0];
    res.json({ ...prefsOf(user), next: next ? { campaign: next.campaign, at: next.at } : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* PATCH /api/users/me/notification-prefs { engagement: boolean } */
router.patch("/users/me/notification-prefs", authMiddleware, async (req, res) => {
  try {
    if (typeof req.body?.engagement !== "boolean") return res.status(400).json({ field: "engagement", message: "Send true or false." });
    await User.updateOne({ _id: req.user.id }, { $set: { "notificationPrefs.engagement": req.body.engagement, "notificationPrefs.engagementUpdatedAt": new Date() } });
    // Switching off also clears tips already waiting in the bell.
    if (!req.body.engagement) await Notification.updateMany({ userId: req.user.id, type: "promo", isRead: false }, { $set: { isRead: true } });
    const user = await User.findById(req.user.id).select("notificationPrefs").lean();
    res.json(prefsOf(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* POST /api/engagement/opened { notificationId } - measures which nudges people act on. */
router.post("/engagement/opened", authMiddleware, async (req, res) => {
  try {
    const id = req.body?.notificationId;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid notification." });
    const n = await Notification.findOneAndUpdate({ _id: id, userId: req.user.id, type: "promo" }, { $set: { isRead: true } }).lean();
    if (n?.campaign) await EngagementSend.updateOne({ key: n.campaign, userId: req.user.id, openedAt: null }, { $set: { openedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
