// "Known contacts" = people the user already shares a group or a direct chat
// with. Name search and direct adds are limited to them; everyone else can
// only be found by their exact email and only gets an invite.
import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import Conversation from "../models/conversationModel.js";

export const getContactIds = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return new Set();
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [groups, convos] = await Promise.all([
    Group.find({ members: uid }).select("members").lean(),
    Conversation.find({ members: uid }).select("members").lean(),
  ]);
  const ids = new Set();
  for (const doc of [...groups, ...convos]) {
    for (const m of doc.members || []) ids.add(String(m));
  }
  ids.delete(String(userId));
  return ids;
};

// "rahul.s@gmail.com" -> "ra****@gmail.com"
export const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "****";
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}****@${domain}`;
};

// Either side blocking the other hides them from each other.
export const isBlockedBetween = (a, b) => {
  const aBlocks = (a?.blockedUsers || []).map(String).includes(String(b?._id));
  const bBlocks = (b?.blockedUsers || []).map(String).includes(String(a?._id));
  return aBlocks || bBlocks;
};

// Invite link lifetime by group type.
export const INVITE_LINK_TTL_DAYS = { roommate: 30, trip: 7, business: 7, general: 14 };
export const inviteLinkExpiry = (groupType, from = new Date()) =>
  new Date(from.getTime() + (INVITE_LINK_TTL_DAYS[groupType] || 14) * 24 * 60 * 60 * 1000);

export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // pending invites/requests
