import mongoose from "mongoose";

// A pending membership: either an invite someone must accept before they are
// added ("invite"), or a join-by-link request the creator must approve
// ("request"). Nobody becomes a member of a group they didn't agree to join.
const groupInviteSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    kind: { type: String, enum: ["invite", "request"], required: true },
    // invite: the invitee. request: the person asking to join.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// At most one open invite/request per person per group.
groupInviteSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("GroupInvite", groupInviteSchema);
