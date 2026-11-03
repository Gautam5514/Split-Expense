import User from "../../models/userModel.js";
import UserProfile from "../../models/userProfileModel.js";
import { sendEngagementNotifications } from "../../controllers/notificationController.js";
import { messageFor } from "./copy.js";
import { upcomingSlots } from "./schedule.js";
import { EngagementSend, isEnabled, setEnabled } from "./models.js";
import { relevantGroups } from "./runner.js";
import { RULES, imageUrl } from "./config.js";

const CAMPAIGNS = ["monthly", "weekend", "trip"];

/* GET /api/admin/engagement - is it on, what goes out next, how the last sends did. */
export async function engagementStatus(req, res) {
  try {
    const tripPerMonth = RULES.tripPerMonth;
    const recent = await EngagementSend.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 90 * 86400_000) } } },
      { $group: { _id: "$key", sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } }, holdout: { $sum: { $cond: [{ $eq: ["$status", "holdout"] }, 1, 0] } }, opened: { $sum: { $cond: [{ $ifNull: ["$openedAt", false] }, 1, 0] } }, at: { $min: "$createdAt" } } },
      { $sort: { at: -1 } }, { $limit: 12 },
    ]);
    res.json({
      enabled: await isEnabled(),
      rules: { perDay: RULES.perDay, per30Days: RULES.per30Days, tripPerMonth, holdoutPct: RULES.holdoutPct },
      upcoming: upcomingSlots(new Date(), 8, { tripPerMonth }).map(s => ({ key: s.key, campaign: s.campaign, at: s.at })),
      recent: recent.map(r => ({ key: r._id, sent: r.sent, holdout: r.holdout, opened: r.opened, at: r.at })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* POST /api/admin/engagement/test { email, campaign } - sends one now (bell + push), ignoring schedule and caps. */
export async function sendEngagementTest(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const campaign = String(req.body?.campaign || "");
    if (!CAMPAIGNS.includes(campaign)) return res.status(400).json({ field: "campaign", message: "Choose monthly, weekend or trip." });
    const user = await User.findOne({ email }).select("_id name expoPushTokens webPushTokens").lean();
    if (!user) return res.status(404).json({ field: "email", message: "No user with that email." });
    const profile = campaign === "trip" ? await UserProfile.findOne({ userId: user._id }).select("city state").lean() : null;
    const group = campaign === "trip" ? null : (await relevantGroups([user._id], campaign)).get(String(user._id));
    const now = new Date(Date.now() + 330 * 60_000);
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const msg = messageFor({ campaign, key: `test:${campaign}:${Date.now()}`, period, step: 1 }, user, profile || {}, group);
    await sendEngagementNotifications([{ userId: user._id, title: msg.title, body: msg.body, prompt: msg.prompt, groupId: msg.groupId, appLink: msg.appLink, webLink: msg.webLink, cta: msg.cta, campaign: `test:${campaign}`, image: imageUrl(msg.image) }]);
    res.json({ sent: true, title: msg.title, body: msg.body, devices: { app: (user.expoPushTokens || []).length, web: (user.webPushTokens || []).length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* PATCH /api/admin/engagement { enabled } - pause or resume scheduled tips, no deploy needed. */
export async function updateEngagement(req, res) {
  try {
    if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ field: "enabled", message: "Send true or false." });
    await setEnabled(req.body.enabled);
    return engagementStatus(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
