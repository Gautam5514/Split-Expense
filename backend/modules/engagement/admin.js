import mongoose from "mongoose";
import User from "../../models/userModel.js";
import UserProfile from "../../models/userProfileModel.js";
import { sendEngagementNotifications } from "../../controllers/notificationController.js";
import { messageFor } from "./copy.js";
import { upcomingSlots, istParts } from "./schedule.js";
import { EngagementSend, Broadcast, getSettings, setEnabled, setCampaignEnabled, confirmFestivalDate } from "./models.js";
import { relevantGroups } from "./runner.js";
import { FETCHERS } from "./behaviour.js";
import { festivalsOfYear, unconfirmed, FESTIVALS, DATED_YEARS } from "./festivals.js";
import { RULES, CAMPAIGNS, imageUrl } from "./config.js";

const slotView = (s) => ({ key: s.key, campaign: s.campaign, tier: s.tier, label: s.label || CAMPAIGNS[s.campaign]?.name || s.campaign, at: s.at, regional: Boolean(s.festival?.states) });

/* GET /api/admin/engagement - switches, what goes out next, festival dates to confirm, how recent sends did. */
export async function engagementStatus(req, res) {
  try {
    const settings = await getSettings();
    const opts = { tripPerMonth: RULES.tripPerMonth, per7Days: RULES.per7Days, overrides: settings.festivalDates, disabled: settings.disabled };
    const now = new Date();
    const { year } = istParts(now);
    const recent = await EngagementSend.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 90 * 86400_000) } } },
      { $group: { _id: "$key", campaign: { $first: "$campaign" }, sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } }, holdout: { $sum: { $cond: [{ $eq: ["$status", "holdout"] }, 1, 0] } }, capped: { $sum: { $cond: [{ $in: ["$status", ["capped", "fatigued"]] }, 1, 0] } }, opened: { $sum: { $cond: [{ $ifNull: ["$openedAt", false] }, 1, 0] } }, at: { $min: "$createdAt" } } },
      { $sort: { at: -1 } }, { $limit: 15 },
    ]);
    const broadcasts = await Broadcast.find({ createdAt: { $gte: new Date(Date.now() - 60 * 86400_000) } }).sort({ at: -1 }).limit(10).lean();
    res.json({
      enabled: settings.enabled,
      rules: { perDay: RULES.perDay, per7Days: RULES.per7Days, per30Days: RULES.per30Days, tripPerMonth: RULES.tripPerMonth, holdoutPct: RULES.holdoutPct, fatigueAfter: RULES.fatigueAfter },
      campaigns: Object.entries(CAMPAIGNS).filter(([id]) => id !== "broadcast").map(([id, c]) => ({ id, name: c.name, tier: c.tier, enabled: !settings.disabled.includes(id) })),
      upcoming: upcomingSlots(now, 14, opts).map(slotView),
      festivals: festivalsOfYear(year, settings.festivalDates).concat(festivalsOfYear(year + 1, settings.festivalDates)).filter(f => new Date(Date.UTC(f.year, f.month - 1, f.day)) >= new Date(now.getTime() - 86400_000)).slice(0, 40)
        .map(f => ({ id: f.id, year: f.year, name: f.name, emoji: f.emoji, date: `${f.year}-${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`, approx: f.approx, regional: Boolean(f.states) })),
      unconfirmed: [...unconfirmed(year, settings.festivalDates), ...unconfirmed(year + 1, settings.festivalDates)],
      calendarUntil: Math.max(...DATED_YEARS),
      recent: recent.map(r => ({ key: r._id, campaign: r.campaign, sent: r.sent, holdout: r.holdout, capped: r.capped, opened: r.opened, at: r.at })),
      broadcasts: broadcasts.map(b => ({ id: String(b._id), title: b.title, body: b.body, at: b.at, status: b.status, audience: b.audience, stats: b.stats || null })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* PATCH /api/admin/engagement { enabled } | { campaign, enabled } | { festival, year, date: "MM-DD" } */
export async function updateEngagement(req, res) {
  try {
    const { campaign, festival, year, date, enabled } = req.body || {};
    if (festival) {
      if (!FESTIVALS[festival]) return res.status(400).json({ field: "festival", message: "Unknown festival." });
      if (!/^\d{4}$/.test(String(year)) || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(date))) return res.status(400).json({ field: "date", message: "Send year and a date as MM-DD." });
      await confirmFestivalDate(festival, Number(year), date);
    } else if (campaign) {
      if (!CAMPAIGNS[campaign] || campaign === "broadcast") return res.status(400).json({ field: "campaign", message: "Unknown campaign." });
      if (typeof enabled !== "boolean") return res.status(400).json({ field: "enabled", message: "Send true or false." });
      await setCampaignEnabled(campaign, enabled);
    } else {
      if (typeof enabled !== "boolean") return res.status(400).json({ field: "enabled", message: "Send true or false." });
      await setEnabled(enabled);
    }
    return engagementStatus(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* POST /api/admin/engagement/test { email, campaign, festival? } - sends one now (bell + push), ignoring schedule and caps. */
export async function sendEngagementTest(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const campaign = String(req.body?.campaign || "");
    if (!CAMPAIGNS[campaign] || campaign === "broadcast") return res.status(400).json({ field: "campaign", message: "Choose a campaign." });
    const user = await User.findOne({ email }).select("_id name lastActiveDate expoPushTokens webPushTokens").lean();
    if (!user) return res.status(404).json({ field: "email", message: "No user with that email." });
    const now = new Date();
    const { year, month } = istParts(now);
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const slot = { campaign, key: `test:${campaign}:${Date.now()}`, period, step: 1 };
    if (campaign === "festival") {
      const id = String(req.body?.festival || "diwali");
      const f = festivalsOfYear(year).find(x => x.id === id) || festivalsOfYear(year + 1).find(x => x.id === id);
      if (!f) return res.status(400).json({ field: "festival", message: "Unknown festival." });
      slot.festival = f; slot.eve = Boolean(req.body?.eve && f.eve);
    }
    if (campaign === "longweekend") { slot.festival = festivalsOfYear(year).find(x => x.id === "christmas"); slot.kind = "fri"; }
    const profile = await UserProfile.findOne({ userId: user._id }).select("city state").lean();
    const group = ["monthly", "weekend", "festival"].includes(campaign) ? (await relevantGroups([user._id], campaign)).get(String(user._id)) : null;
    let data = {};
    if (FETCHERS[campaign]) {
      data = (await FETCHERS[campaign]([user], now, {})).get(String(user._id));
      // A test must always show something, so sample numbers stand in when the person has none.
      if (!data) data = { recap: { spent: 2450, count: 4, topGroup: group?.name || "Flat 302", back: 900 }, settle: { direction: "owed", amount: 1200, other: "Rahul", group: "Goa Trip", groupId: null }, winback: { newCount: 3, group: "Flat 302", groupId: null, days: 16 }, onboard: { day: 3, group: null, groupId: null } }[campaign];
    }
    const msg = messageFor(slot, user, profile || {}, group, data);
    await sendEngagementNotifications([{ userId: user._id, title: msg.title, body: msg.body, prompt: msg.prompt, groupId: msg.groupId, appLink: msg.appLink, webLink: msg.webLink, cta: msg.cta, campaign: `test:${campaign}`, image: msg.image ? imageUrl(msg.image) : undefined }]);
    res.json({ sent: true, title: msg.title, body: msg.body, devices: { app: (user.expoPushTokens || []).length, web: (user.webPushTokens || []).length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* POST /api/admin/engagement/broadcast { title, body, cta?, link?, prompt?, at?, audience?, ignoreCaps? } - schedule a one-off message. */
export async function createBroadcast(req, res) {
  try {
    const b = req.body || {};
    const title = String(b.title || "").trim(), body = String(b.body || "").trim();
    if (title.length < 3 || title.length > 60) return res.status(400).json({ field: "title", message: "Title: 3 to 60 characters." });
    if (body.length < 10 || body.length > 160) return res.status(400).json({ field: "body", message: "Body: 10 to 160 characters." });
    const at = b.at ? new Date(b.at) : new Date();
    if (Number.isNaN(at.getTime())) return res.status(400).json({ field: "at", message: "Send a valid date and time." });
    // Quiet hours: anything landing between 21:00 and 09:00 IST moves to 09:00 the next morning.
    const ist = new Date(at.getTime() + 330 * 60_000);
    const h = ist.getUTCHours();
    if (h >= 21 || h < 9) { if (h >= 21) ist.setUTCDate(ist.getUTCDate() + 1); ist.setUTCHours(9, 0, 0, 0); at.setTime(ist.getTime() - 330 * 60_000); }
    const doc = await Broadcast.create({
      title, body, cta: String(b.cta || "Open SplitEase").trim().slice(0, 24) || "Open SplitEase", link: String(b.link || "/dashboard").trim(), prompt: String(b.prompt || "").trim().slice(0, 200),
      image: /^[\w-]+\.png$/.test(String(b.image || "")) ? b.image : "", at, audience: ["everyone", "active", "inactive"].includes(b.audience) ? b.audience : "everyone",
      ignoreCaps: Boolean(b.ignoreCaps), createdBy: req.admin?.email || req.admin?.id || "admin",
    });
    res.status(201).json({ id: String(doc._id), at: doc.at, status: doc.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* DELETE /api/admin/engagement/broadcast/:id - cancel one that hasn't finished. */
export async function cancelBroadcast(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
    const r = await Broadcast.updateOne({ _id: req.params.id, status: { $in: ["scheduled", "sending"] } }, { $set: { status: "cancelled" } });
    res.json({ cancelled: r.modifiedCount > 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
