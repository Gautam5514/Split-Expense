import mongoose from "mongoose";

// One row per user per campaign slot. The unique index is the send guarantee: a row is
// claimed before anything is pushed, so restarts, overlapping ticks or a second server
// can never send the same campaign to the same person twice.
const sendSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g. "trip:2026-11:1", "festival:diwali:2026", "settle:2026-11-11"
  campaign: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true }, // IST date, for the one-a-day cap
  variant: String,
  // holdout: deliberately not sent, to measure what the campaign really changes.
  // fatigued: skipped because the person ignored the last few tips (generic tier only).
  status: { type: String, enum: ["claimed", "sent", "holdout", "capped", "fatigued", "failed"], default: "claimed" },
  personalised: Boolean,
  openedAt: Date,
  createdAt: { type: Date, default: Date.now },
});
sendSchema.index({ key: 1, userId: 1 }, { unique: true });
sendSchema.index({ userId: 1, createdAt: -1 });
// Keep a year of history for reporting.
sendSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 86400 });
export const EngagementSend = mongoose.model("EngagementSend", sendSchema);

// Per-person frequency state: one small document, read and written in one atomic step.
// `recent` keeps at most RULES.per30Days send times, `week` at most RULES.per7Days (oldest first).
// `streak` counts tips sent since the person last opened one; it drives the fatigue rule.
const stateSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastDay: String, // IST date of the last tip
  recent: { type: [Date], default: [] },
  week: { type: [Date], default: [] },
  streak: { type: Number, default: 0 },
  lastOpenedAt: Date,
}, { versionKey: false });
export const EngagementState = mongoose.model("EngagementState", stateSchema);

// Admin settings: the on/off switch, campaigns switched off individually, and festival
// dates the admin confirmed ("eid:2027" -> "03-10"). No document means everything is on.
const settingSchema = new mongoose.Schema({
  _id: { type: String, default: "global" },
  enabled: { type: Boolean, default: true },
  disabled: { type: [String], default: [] },
  festivalDates: { type: Map, of: String, default: {} },
  updatedAt: { type: Date, default: Date.now },
});
export const EngagementSetting = mongoose.model("EngagementSetting", settingSchema);
export const getSettings = async () => {
  const doc = await EngagementSetting.findById("global").lean();
  return { enabled: doc?.enabled !== false, disabled: doc?.disabled || [], festivalDates: Object.fromEntries(Object.entries(doc?.festivalDates || {})) };
};
export const isEnabled = async () => (await getSettings()).enabled;
export const setEnabled = (enabled) => EngagementSetting.updateOne({ _id: "global" }, { $set: { enabled, updatedAt: new Date() } }, { upsert: true });
export const setCampaignEnabled = (campaign, enabled) => EngagementSetting.updateOne({ _id: "global" }, { [enabled ? "$pull" : "$addToSet"]: { disabled: campaign }, $set: { updatedAt: new Date() } }, { upsert: true });
export const confirmFestivalDate = (id, year, mmdd) => EngagementSetting.updateOne({ _id: "global" }, { $set: { [`festivalDates.${id}:${year}`]: mmdd, updatedAt: new Date() } }, { upsert: true });

// One-off messages the admin writes (a launch, an offer, an apology). Sent inside its window
// like any slot: claimed per person, capped, logged. `audience` narrows who gets it.
const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 60 },
  body: { type: String, required: true, maxlength: 160 },
  cta: { type: String, default: "Open SplitEase", maxlength: 24 },
  link: { type: String, default: "/dashboard" }, // web path; the app maps it
  prompt: { type: String, default: "" }, // optional Autopilot draft
  image: { type: String, default: "" }, // banner file name under /notifications, or empty
  at: { type: Date, required: true }, // when to send (any timezone; quiet hours still apply)
  windowMinutes: { type: Number, default: 180 },
  audience: { type: String, enum: ["everyone", "active", "inactive"], default: "everyone" },
  ignoreCaps: { type: Boolean, default: false }, // true: send even to people who had a tip today
  status: { type: String, enum: ["scheduled", "sending", "done", "cancelled"], default: "scheduled" },
  stats: { type: Object, default: undefined },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});
broadcastSchema.index({ status: 1, at: 1 });
export const Broadcast = mongoose.model("EngagementBroadcast", broadcastSchema);
