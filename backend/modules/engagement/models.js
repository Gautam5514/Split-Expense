import mongoose from "mongoose";

// One row per user per campaign slot. The unique index is the send guarantee: a row is
// claimed before anything is pushed, so restarts, overlapping ticks or a second server
// can never send the same campaign to the same person twice.
const sendSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g. "trip:2026-11:1"
  campaign: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true }, // IST date, for the one-a-day cap
  variant: String,
  // holdout: deliberately not sent, to measure what the campaign really changes.
  status: { type: String, enum: ["claimed", "sent", "holdout", "capped", "failed"], default: "claimed" },
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
// `recent` keeps at most RULES.per30Days send times (oldest first).
const stateSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastDay: String, // IST date of the last tip
  recent: { type: [Date], default: [] },
}, { versionKey: false });
export const EngagementState = mongoose.model("EngagementState", stateSchema);

// The admin on/off switch. No document means on.
const settingSchema = new mongoose.Schema({ _id: { type: String, default: "global" }, enabled: { type: Boolean, default: true }, updatedAt: { type: Date, default: Date.now } });
export const EngagementSetting = mongoose.model("EngagementSetting", settingSchema);
export const isEnabled = async () => (await EngagementSetting.findById("global").lean())?.enabled !== false;
export const setEnabled = (enabled) => EngagementSetting.updateOne({ _id: "global" }, { $set: { enabled, updatedAt: new Date() } }, { upsert: true });
