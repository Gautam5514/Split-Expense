// Pending group memberships: invites a person accepts/declines, and
// join-by-link requests the group creator approves. Also "leave group".
import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import GroupInvite from "../models/groupInviteModel.js";
import { createNotification } from "./notificationController.js";
import { computeGroupBalances, invalidateBalanceCache } from "./balanceController.js";
import { isValidObjectId } from "../middleware/validate.js";
import { maskEmail } from "../utils/contacts.js";

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());
const isCreator = (group, reqUser) => {
  const stored = String(group.createdBy?._id || group.createdBy);
  return stored === String(reqUser?.id || "") ||
    (reqUser?.firebaseUid && stored === String(reqUser.firebaseUid));
};
const isLive = (inv) => inv.status === "pending" && new Date(inv.expiresAt) > new Date();

// Adds `userId` to the group and tells everyone else.
const addToGroup = async (group, userId, joinedName, how) => {
  await Group.updateOne({ _id: group._id }, { $addToSet: { members: new mongoose.Types.ObjectId(String(userId)) } });
  invalidateBalanceCache(group._id);
  const others = group.members.map(String).filter((id) => id !== String(userId));
  if (others.length) {
    void createNotification(
      others,
      `${joinedName} ${how} "${group.name}"`,
      `/groups/${group._id}`,
      "group",
      { groupName: group.name, groupId: group._id }
    );
  }
};

/* GET /api/invites - my pending invites */
export const getMyInvites = async (req, res) => {
  try {
    const uid = asId(req.user);
    const invites = await GroupInvite.find({
      userId: uid, kind: "invite", status: "pending", expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate("groupId", "name icon photo groupType members")
      .populate("invitedBy", "name email")
      .lean();
    res.json(
      invites
        .filter((i) => i.groupId)
        .map((i) => ({
          _id: i._id,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
          group: {
            _id: i.groupId._id,
            name: i.groupId.name,
            icon: i.groupId.icon,
            photo: i.groupId.photo,
            groupType: i.groupId.groupType,
            memberCount: i.groupId.members?.length || 0,
          },
          invitedBy: i.invitedBy ? { _id: i.invitedBy._id, name: i.invitedBy.name, email: maskEmail(i.invitedBy.email) } : null,
        }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/invites/:inviteId/accept */
export const acceptInvite = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { inviteId } = req.params;
    if (!isValidObjectId(inviteId)) return res.status(400).json({ message: "Invalid invite." });
    const invite = await GroupInvite.findOne({ _id: inviteId, userId: uid, kind: "invite" });
    if (!invite || !isLive(invite)) return res.status(404).json({ message: "This invite is no longer available." });
    const group = await Group.findById(invite.groupId);
    if (!group) {
      await GroupInvite.updateOne({ _id: invite._id }, { $set: { status: "cancelled" } });
      return res.status(404).json({ message: "This group no longer exists." });
    }
    // Claim the invite first so a double tap can't run this twice.
    const claimed = await GroupInvite.findOneAndUpdate(
      { _id: invite._id, status: "pending" },
      { $set: { status: "accepted", respondedAt: new Date() } }
    );
    if (!claimed) return res.status(409).json({ message: "Invite already answered." });
    if (!group.members.map(String).includes(String(uid))) {
      await addToGroup(group, uid, req.user.name || "Someone", "joined");
    }
    res.json({ success: true, groupId: group._id });
  } catch (err) {
    console.error("acceptInvite error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/invites/:inviteId/decline  { block?: boolean } */
export const declineInvite = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { inviteId } = req.params;
    if (!isValidObjectId(inviteId)) return res.status(400).json({ message: "Invalid invite." });
    const invite = await GroupInvite.findOneAndUpdate(
      { _id: inviteId, userId: uid, kind: "invite", status: "pending" },
      { $set: { status: "declined", respondedAt: new Date() } },
      { new: true }
    );
    if (!invite) return res.status(404).json({ message: "This invite is no longer available." });
    if (req.body?.block === true && invite.invitedBy && String(invite.invitedBy) !== String(uid)) {
      await User.updateOne({ _id: uid }, { $addToSet: { blockedUsers: invite.invitedBy } });
      // Drop any other open invites from the same person.
      await GroupInvite.updateMany(
        { userId: uid, invitedBy: invite.invitedBy, status: "pending" },
        { $set: { status: "declined", respondedAt: new Date() } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* GET /api/groups/:groupId/invites - creator: pending invites + join requests */
export const getGroupInvites = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId).select("createdBy members").lean();
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isCreator(group, req.user)) return res.json({ invites: [], requests: [] });
    const rows = await GroupInvite.find({ groupId, status: "pending", expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .populate("userId", "name email photoURL")
      .lean();
    const shape = (r) => ({
      _id: r._id,
      kind: r.kind,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      user: r.userId ? { _id: r.userId._id, name: r.userId.name, email: maskEmail(r.userId.email), photoURL: r.userId.photoURL || null } : null,
    });
    res.json({
      invites: rows.filter((r) => r.kind === "invite" && r.userId).map(shape),
      requests: rows.filter((r) => r.kind === "request" && r.userId).map(shape),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/groups/:groupId/invites/:inviteId/approve - creator approves a join request */
export const approveJoinRequest = async (req, res) => {
  try {
    const { groupId, inviteId } = req.params;
    if (!isValidObjectId(groupId) || !isValidObjectId(inviteId)) return res.status(400).json({ message: "Invalid request." });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isCreator(group, req.user)) return res.status(403).json({ message: "Only the group creator can approve requests." });
    const request = await GroupInvite.findOneAndUpdate(
      { _id: inviteId, groupId, kind: "request", status: "pending", expiresAt: { $gt: new Date() } },
      { $set: { status: "accepted", respondedAt: new Date() } },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: "This request is no longer available." });
    const joiner = await User.findById(request.userId).select("name").lean();
    await addToGroup(group, request.userId, joiner?.name || "Someone", "joined");
    void createNotification(
      [request.userId],
      `You're in! Your request to join "${group.name}" was approved`,
      `/groups/${group._id}`,
      "group",
      { groupName: group.name, groupId: group._id }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("approveJoinRequest error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* DELETE /api/groups/:groupId/invites/:inviteId - creator cancels an invite or rejects a request */
export const cancelGroupInvite = async (req, res) => {
  try {
    const { groupId, inviteId } = req.params;
    if (!isValidObjectId(groupId) || !isValidObjectId(inviteId)) return res.status(400).json({ message: "Invalid request." });
    const group = await Group.findById(groupId).select("createdBy").lean();
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isCreator(group, req.user)) return res.status(403).json({ message: "Only the group creator can do this." });
    const r = await GroupInvite.findOneAndUpdate(
      { _id: inviteId, groupId, status: "pending" },
      { $set: { status: "cancelled", respondedAt: new Date() } }
    );
    if (!r) return res.status(404).json({ message: "Already answered." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/groups/:groupId/leave - members (not the creator) leave once settled */
export const leaveGroup = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.members.map(String).includes(String(uid))) return res.status(400).json({ message: "You're not in this group." });
    if (isCreator(group, req.user))
      return res.status(400).json({ message: "You created this group - delete it instead of leaving." });

    const computed = await computeGroupBalances(groupId);
    const bal = Number(computed?.balances?.[String(uid)] || 0);
    if (Math.abs(bal) >= 1)
      return res.status(400).json({
        message: bal < 0 ? "Settle what you owe before leaving." : "Collect what you're owed before leaving.",
        balance: bal,
      });

    await Group.updateOne({ _id: groupId }, { $pull: { members: new mongoose.Types.ObjectId(String(uid)) } });
    invalidateBalanceCache(groupId);
    const others = group.members.map(String).filter((id) => id !== String(uid));
    if (others.length) {
      void createNotification(
        others,
        `${req.user.name || "Someone"} left "${group.name}"`,
        `/groups/${group._id}`,
        "group",
        { groupName: group.name, groupId: group._id }
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("leaveGroup error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
