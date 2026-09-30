import mongoose from "mongoose";
import { GROUP_TYPES, DEFAULT_SPLIT_TYPES } from "../utils/groupPresets.js";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isCompleted: { type: Boolean, default: false},
    inviteCode: { type: String, unique: true, sparse: true },
    // Invite links stop working after this; null = legacy link, no expiry.
    inviteExpiresAt: { type: Date, default: null },
    groupType: { type: String, enum: GROUP_TYPES, default: "general" },
    icon: { type: String, default: null, trim: true },
    photo: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    settings: {
      currency: { type: String, default: "INR" },
      // Pre-selected split in the Add Expense sheet (e.g. rent 2:1:1).
      defaultSplit: {
        type: { type: String, enum: DEFAULT_SPLIT_TYPES, default: "equal" },
        weights: {
          type: [
            {
              _id: false,
              userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
              value: { type: Number, min: 0 },
            },
          ],
          default: [],
        },
      },
      categories: { type: [String], default: undefined },
      receiptRequired: { type: Boolean, default: false },
      // Joining by link creates a request the creator approves.
      joinApproval: { type: Boolean, default: false },
      // Creator-controlled: when true, the group notepad is visible and
      // usable by everyone in the group. Off by default.
      notepadEnabled: { type: Boolean, default: false },
    },
    trip: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      budget: { type: Number, default: null, min: 0 },
    },
    roommate: {
      billDay: { type: Number, default: null, min: 1, max: 28 },
    },
  },
  { timestamps: true }
);

// Deduplicate members and strip null/invalid ObjectIds on every save
groupSchema.pre("save", function (next) {
  if (this.isModified("members")) {
    const seen = new Set();
    this.members = this.members.filter((id) => {
      if (id == null) return false;
      const key = id.toString();
      if (!mongoose.Types.ObjectId.isValid(key) || key === "null" || key === "undefined") return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  next();
});

// optional: avoid dup groups per creator
groupSchema.index({ name: 1, createdBy: 1 }, { unique: true });
// "Groups I'm in", newest first - the query behind almost every page.
groupSchema.index({ members: 1, updatedAt: -1 });

export default mongoose.model("Group", groupSchema);
