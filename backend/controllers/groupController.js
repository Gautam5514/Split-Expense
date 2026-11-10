import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import { isValidEmail, isValidObjectId, escapeRegExp, normalizeEmail } from "../middleware/validate.js";
import Expense from "../models/expenseModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import Notepad from "../models/notepadModel.js";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";
import UserProfile from "../models/userProfileModel.js";
import { sendEmail, sendEmailsSafely } from "../utils/emailService.js";
import { loadGroupReport, reportFileName } from "../services/groupReportService.js";
import { buildInviteEmail } from "../services/inviteEmail.js";
import { inviteLinks } from "../utils/publicUrl.js";
import {
  queueGroupStatement, getGroupStatementStatus, retryFailedStatement, recentManualStatement, cancelGroupStatements,
} from "../services/statementOutbox.js";
import { renderReportPdf } from "../utils/settlementReport.js";
import { isValidGroupIcon } from "../utils/groupIcons.js";
import { GROUP_TYPES, presetFor } from "../utils/groupPresets.js";
import { buildGroupSettingsUpdate, unflatten } from "../utils/groupSettings.js";
import GroupInvite from "../models/groupInviteModel.js";
import { generateInviteCode, isShortInviteCode, normalizeInviteCode } from "../utils/inviteCode.js";
import { searchContacts, lookupUserByEmail } from "./peopleController.js";
import { getContactIds, isBlockedBetween, inviteLinkExpiry, INVITE_TTL_MS } from "../utils/contacts.js";
import cloudinary from "../config/cloudinary.js";
import { notifyGroupChange, notifyUsers } from "../utils/realtime.js";
import { uploadRejectionReason, IMAGE_MIME_TYPES } from "../utils/uploadSecurity.js";
import { eliteTierKey } from "../utils/storeAccess.js";

// Helper utilities
const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());
const sameId = (a, b) => String(a) === String(b);
const isMember = (group, userId) =>
  (group.members || []).some((m) => String(m) === String(userId));

// Checks if reqUser is the creator of a group.
// Handles legacy data where createdBy may store a Firebase UID (old code)
// or a MongoDB ObjectId (new code).
const isCreator = (group, reqUser) => {
  const stored = String(group.createdBy?._id || group.createdBy);
  const mongoId = String(reqUser?.id || "");
  const fbUid   = String(reqUser?.firebaseUid || "");
  return stored === mongoId || (fbUid && stored === fbUid);
};

export const createGroup = async (req, res) => {
  try {
    const { name, groupType, icon } = req.body;
    if (typeof name !== "string" || !name.trim())
      return res.status(400).json({ field: "name", message: "Group name is required." });
    if (name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Group name must be at least 2 characters." });
    if (name.trim().length > 100)
      return res.status(400).json({ field: "name", message: "Group name must be under 100 characters." });
    if (icon && !isValidGroupIcon(icon))
      return res.status(400).json({ field: "icon", message: "Invalid icon selection." });
    if (groupType && !GROUP_TYPES.includes(groupType))
      return res.status(400).json({ field: "groupType", message: "Invalid group type." });

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    // Type-specific setup (currency, budget, dates, bill day...) chosen in the
    // create wizard. Members are added afterwards through the normal
    // add-members endpoint, so a new group can only weight its creator.
    const { update: extras, error, field } = buildGroupSettingsUpdate(
      { settings: req.body.settings, trip: req.body.trip, roommate: req.body.roommate },
      { memberIds: [uid] }
    );
    if (error) return res.status(400).json({ field, message: error });

    // New groups default to Roommates (the most common use). The schema
    // default stays "general" so older groups saved without a type keep it.
    const type = groupType || "roommate";
    const preset = presetFor(type);
    const group = await Group.create(unflatten({
      name: name.trim(),
      createdBy: uid,
      members: [uid],
      groupType: type,
      icon: icon || preset.icon || null,
      "settings.categories": preset.categories,
      ...extras,
    }));

    const populated = await Group.findById(group._id).populate(
      "members",
      "name email"
    );
    // The creator's other devices (phone + web) show the new group right away.
    void notifyGroupChange(req.app?.get?.("io"), group._id, "created", [uid]);
    res.status(201).json(populated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "You already have a group with this name. Please choose another name.",
      });
    }
    res.status(500).json({ message: err.message });
  }
};

/**
 * Build photoURL Maps for a set of member IDs using 2 batched queries.
 * Returns a Map<userId_string, photoURL|null> for O(1) lookup.
 */
const buildPhotoMap = async (memberIds) => (await buildMemberMaps(memberIds)).photoMap;

/**
 * Same two queries, plus each member's Elite tier (the referral badge shown
 * next to their name). Coin numbers themselves never leave the server.
 */
const buildMemberMaps = async (memberIds) => {
  const ids = [...new Set(memberIds.map(String))];
  if (ids.length === 0) return { photoMap: new Map(), tierMap: new Map() };

  const [profiles, users] = await Promise.all([
    UserProfile.find({ userId: { $in: ids } }).select("userId profileImage.url").lean(),
    User.find({ _id: { $in: ids } }).select("photoURL coins lifetimeCoinsEarned").lean(),
  ]);
  const tierMap = new Map((users || []).map((u) => [String(u._id), eliteTierKey(u)]));

  const profileMap = new Map(profiles.map((p) => [String(p.userId), p.profileImage?.url || null]));
  const photoMap   = new Map(users.map((u) => [String(u._id), u.photoURL || null]));

  // Merge: Google photoURL takes priority over manual upload
  for (const [id, url] of profileMap) {
    if (!photoMap.get(id)) photoMap.set(id, url);
  }
  return { photoMap, tierMap };
};

/**
 * ✅ GET /api/groups
 */
export const getGroups = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?._id?.toString();
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const currentUser = await User.findById(uid).select("hiddenGroupChats").lean();
    const hiddenGroupChats = (currentUser?.hiddenGroupChats || []).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const groupFilter = {
      members: new mongoose.Types.ObjectId(uid),
    };

    if (req.query.context === "chat" && hiddenGroupChats.length) {
      groupFilter._id = { $nin: hiddenGroupChats };
    }

    const groups = await Group.find(groupFilter)
      .sort({ updatedAt: -1 })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();

    // Collect ALL unique member IDs across all groups - then 2 queries total
    const allMemberIds = groups.flatMap((g) => (g.members || []).map((m) => m._id));
    const photoMap = await buildPhotoMap(allMemberIds);

    const enrichedGroups = groups.map((g) => ({
      ...g,
      members: (g.members || []).map((m) => ({
        ...m,
        photoURL: photoMap.get(String(m._id)) || null,
      })),
      status: String(g.createdBy?._id || g.createdBy) === String(uid) ? "active" : "inactive",
    }));

    res.json(enrichedGroups);
  } catch (err) {
    console.error("getGroups error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ GET /api/groups/:groupId
 */
export const getGroupById = async (req, res) => {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(req.params.groupId)) return res.status(400).json({ message: "Invalid group ID" });

    const group = await Group.findById(req.params.groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();

    if (!group) return res.status(404).json({ message: "Group not found." });

    const memberIds = (group.members || []).map((m) => String(m._id));
    const creatorId = String(group.createdBy?._id || group.createdBy);

    const isMember = memberIds.includes(uid) || creatorId === uid;
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group." });
    }

    // Auto-heal: ensure creator is in members (guard: only run if creatorId is a valid ObjectId)
    if (
      creatorId &&
      creatorId !== "null" &&
      creatorId !== "undefined" &&
      mongoose.Types.ObjectId.isValid(creatorId) &&
      !memberIds.includes(creatorId)
    ) {
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: new mongoose.Types.ObjectId(creatorId) } }
      );
    }

    // Photo lookup and the "has expenses" check are independent - run together.
    // (Settings that define how expenses work lock after the first expense.)
    const [{ photoMap, tierMap }, existingExpense] = await Promise.all([
      buildMemberMaps((group.members || []).map((m) => m._id)),
      Expense.exists({ groupId: group._id }),
    ]);
    const enrichedMembers = (group.members || []).map((m) => ({
      ...m,
      photoURL: photoMap.get(String(m._id)) || null,
      eliteTier: tierMap.get(String(m._id)) || "starter",
    }));
    const hasExpenses = !!existingExpense;

    res.json({
      ...group,
      members: enrichedMembers,
      hasExpenses,
    });
  } catch (err) {
    console.error("getGroupById error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/groups/:groupId/members  { emails?: string[], userIds?: string[] }
 *
 * Nobody is put into a group they didn't agree to:
 *  - known contacts (shared group/chat) whose privacy allows it -> added directly
 *  - every other registered user -> a GroupInvite they accept or decline
 *  - unregistered emails -> an email with the join link (as before)
 * Blocked pairs are silently skipped (reported like an invite, so a block
 * can't be detected from the response).
 */
export const addMembersByEmail = async (req, res) => {
  try {
    const emails = req.body.emails ?? [];
    const userIds = req.body.userIds ?? [];
    const { groupId } = req.params;
    const uid = req.user?.id || req.user?._id?.toString();

    if (!Array.isArray(emails) || !Array.isArray(userIds))
      return res.status(400).json({ field: "emails", message: "Invalid member list." });
    if (emails.length + userIds.length === 0)
      return res.status(400).json({ field: "emails", message: "Please provide at least one email address." });
    if (emails.length + userIds.length > 20)
      return res.status(400).json({ field: "emails", message: "You can add at most 20 members at a time." });
    const invalidEmails = emails.filter((e) => typeof e !== "string" || !isValidEmail(e));
    if (invalidEmails.length)
      return res.status(400).json({
        field: "emails",
        message: `Invalid email format: ${invalidEmails.slice(0, 3).join(", ")}`,
      });
    if (userIds.some((id) => !isValidObjectId(id)))
      return res.status(400).json({ field: "userIds", message: "Invalid member." });

    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only the group creator can add members." });

    const out = await addMembersCore({ group, actor: { id: uid, name: req.user.name }, emails, userIds, io: req.app?.get?.("io") });
    const finalGroup = await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json({
      group: finalGroup,
      added: out.direct.length,
      pending: out.toInvite.length + out.skipped,
      invited: out.unregisteredEmails.length,
      invitedEmails: out.unregisteredEmails,
    });
  } catch (err) {
    console.error("❌ addMembersByEmail:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * The one place that decides how a person joins a group (see addMembersByEmail).
 * Shared by the HTTP endpoint and Autopilot so both obey the same consent rules.
 * `group` must be a mongoose document. With `session`, every write joins that
 * transaction; with `after` (an array), notifications and emails are queued there
 * for the caller to run once the transaction has committed.
 */
export async function addMembersCore({ group, actor, emails = [], userIds = [], io = null, session = null, after = null }) {
  const effect = (fn) => (after ? after.push(fn) : void fn());
  const opts = session ? { session } : {};
  const uid = actor.id;
  const groupId = group._id;
    const normalizedEmails = [...new Set(emails.map(normalizeEmail))];
    const [registeredUsers, inviter, contactIds] = await Promise.all([
      User.find(
        { $or: [{ email: { $in: normalizedEmails } }, { _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } }] },
        "_id email name privacy blockedUsers"
      ).session(session),
      User.findById(uid).select("blockedUsers").session(session).lean(),
      getContactIds(uid),
    ]);
    const registeredEmails = new Set(registeredUsers.map((u) => u.email));
    const unregisteredEmails = normalizedEmails.filter((e) => !registeredEmails.has(e));
    const memberSet = new Set(group.members.map(String));

    const direct = [];
    const toInvite = [];
    let skipped = 0;
    for (const u of registeredUsers) {
      const id = String(u._id);
      if (id === String(uid) || memberSet.has(id)) continue;
      if (isBlockedBetween(inviter, u)) { skipped++; continue; }
      if (contactIds.has(id) && u.privacy?.addPolicy !== "invite") direct.push(u);
      else toInvite.push(u);
    }

    // Direct adds
    if (direct.length > 0) {
      const userIdsToAdd = direct.map((u) => new mongoose.Types.ObjectId(u._id));
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: { $each: [group.createdBy, ...userIdsToAdd].filter((x) => mongoose.Types.ObjectId.isValid(String(x))) } } },
        opts
      );
      effect(() => notifyGroupChange(io, groupId, "member"));

      effect(() => createNotification(
        userIdsToAdd,
        `You were added to group "${group.name}" by ${actor.name}`,
        `/groups/${group._id}`,
        "group",
        { groupName: group.name, groupId: group._id }
      ));

      const existingMemberIds = group.members
        .map(String)
        .filter((id) => !userIdsToAdd.map(String).includes(id) && id !== String(uid));
      if (existingMemberIds.length > 0) {
        const addedNames = direct.map((u) => u.name || u.email).join(", ");
        effect(() => createNotification(
          existingMemberIds,
          `${actor.name} added ${addedNames} to "${group.name}"`,
          `/groups/${group._id}`,
          "group",
          { groupName: group.name, groupId: group._id }
        ));
      }
    }

    // Invites (accept / decline)
    if (toInvite.length > 0) {
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await Promise.all(toInvite.map((u) =>
        GroupInvite.findOneAndUpdate(
          { groupId: group._id, userId: u._id, status: "pending" },
          { $set: { kind: "invite", invitedBy: uid, expiresAt } },
          { upsert: true, new: true, setDefaultsOnInsert: true, ...opts }
        )
      ));
      effect(() => notifyUsers(io, toInvite.map((u) => u._id), { groupId: String(groupId), kind: "invite" }));
      effect(() => notifyGroupChange(io, groupId, "invite"));
      effect(() => createNotification(
        toInvite.map((u) => u._id),
        `${actor.name} invited you to join "${group.name}"`,
        "/invites",
        "group",
        { groupName: group.name, groupId: group._id }
      ));
    }

    // Send invitation emails to unregistered addresses
    if (unregisteredEmails.length > 0) {
      const joinLink = await ensureInviteLink(group);
      const inviterName = actor.name || "A friend";

      // Send sequentially through the pooled transporter so a batch of invites
      // never opens a burst of parallel SMTP connections (which Gmail rejects).
      effect(() => sendEmailsSafely(
        unregisteredEmails.map((email) => ({
          to: email,
          ...buildInviteEmail({ inviterName, groupName: group.name, joinLink: inviteLinks(group.inviteCode).email, email, expiresAt: group.inviteExpiresAt }),
        }))
      ));
    }

  return { direct, toInvite, unregisteredEmails, skipped };
}

// A fresh short code no other group is using (collisions are ~1 in 887M,
// so the retry loop is only a safety net).
const uniqueInviteCode = async () => {
  for (let i = 0; i < 8; i++) {
    const code = generateInviteCode();
    if (!(await Group.exists({ inviteCode: code }))) return code;
  }
  throw new Error("Could not create an invite code. Please try again.");
};

// Makes sure the group has a live (non-expired) invite code and returns the
// join URL. Legacy links without an expiry get one the next time they're shared.
const ensureInviteLink = async (group, { reset = false } = {}) => {
  const expired = group.inviteExpiresAt && group.inviteExpiresAt < new Date();
  // Old 32-character codes are swapped for a short one the next time the
  // link is shared, so everyone moves to the typeable 6-character format.
  if (!group.inviteCode || expired || reset || !isShortInviteCode(group.inviteCode)) {
    group.inviteCode = await uniqueInviteCode();
    group.inviteExpiresAt = inviteLinkExpiry(group.groupType);
    await group.save();
  } else if (!group.inviteExpiresAt) {
    group.inviteExpiresAt = inviteLinkExpiry(group.groupType);
    await group.save();
  }
  return inviteLinks(group.inviteCode).url;
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    if (!isValidObjectId(groupId) || !isValidObjectId(userId))
      return res.status(400).json({ message: "Invalid group or user ID" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only the group creator can remove members." });

    if (isCreator({ createdBy: userId }, req.user))
      return res.status(400).json({ message: "Creator cannot be removed from the group." });

    await Group.updateOne({ _id: groupId }, { $pull: { members: userId } });
    // include the removed person so their dashboard drops the group too
    void notifyGroupChange(req.app?.get?.("io"), groupId, "member", [...group.members.map(String), String(userId)]);

    const updated = await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/groups/:groupId/available-users?q=
 * People you can add: known contacts matching q (name/email), plus - only for
 * an exact email - that one person with a masked email. It used to search the
 * whole user table, which leaked everyone's name + email to any member.
 */
export const listAvailableUsers = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 20);

    const group = await Group.findById(groupId, "members createdBy");
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isMember(group, req.user.id) && !isCreator(group, req.user))
      return res.status(403).json({ message: "Not a member of this group." });
    if (q.length > 100) return res.status(400).json({ message: "Search term is too long." });

    const memberIds = group.members.map(String);
    const results = await searchContacts(req.user.id, { q, limit, excludeIds: memberIds });
    if (isValidEmail(q) && !results.some((u) => u.email?.toLowerCase() === q.toLowerCase())) {
      const found = await lookupUserByEmail(req.user.id, q);
      if (found && !memberIds.includes(String(found._id))) results.unshift(found);
    }
    res.json(results);
  } catch (err) {
    console.error("listAvailableUsers error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const markGroupCompleted = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user)) {
      return res.status(403).json({ message: "Only the creator can mark as completed" });
    }

    const wasCompleted = group.isCompleted === true;
    group.isCompleted = true;
    await group.save();
    // Queue the settlement statement (PDF) for every member - only on the
    // first completion so re-clicking never spams the group.
    if (!wasCompleted) void queueGroupStatement(groupId, { reason: "completed", triggeredBy: { userId: uid, name: req.user.name } });
    void notifyGroupChange(req.app?.get?.("io"), groupId, "completed", group.members.map(String));

    // Notify other members
    const otherMembers = group.members.map(String).filter((id) => id !== String(uid));
    if (otherMembers.length > 0) {
      void createNotification(
        otherMembers,
        `"${group.name}" has been marked as completed by ${req.user.name}`,
        `/groups/${group._id}`,
        "group",
        { groupName: group.name, groupId: group._id }
      );
    }

    res.json({ success: true, message: "Trip marked as completed", group });
  } catch (err) {
    console.error("markGroupCompleted error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

// Statement PDF for any member, any time (live numbers).
export const downloadGroupReport = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId, "members createdBy");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, req.user.id) && !isCreator(group, req.user))
      return res.status(403).json({ message: "Not a member of this group." });

    const data = await loadGroupReport(groupId);
    const pdf = await renderReportPdf(data, { viewerId: String(req.user.id) });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFileName(data)}"`,
      "Content-Length": pdf.length,
      "Cache-Control": "private, no-store",
    });
    res.send(pdf);
  } catch (err) {
    console.error("downloadGroupReport error:", err.message);
    res.status(500).json({ message: "Could not generate the report." });
  }
};

// Creator re-sends the statement to everyone now (e.g. after final settlements).
const MANUAL_COOLDOWN_MS = 5 * 60 * 1000;
export const resendGroupReport = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId, "members createdBy isCompleted");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isCreator(group, req.user)) return res.status(403).json({ message: "Only the creator can send the statement." });

    if (!group.isCompleted) {
      const data = await loadGroupReport(groupId);
      if (!data?.fullySettled)
        return res.status(400).json({ message: "Mark the group as completed or settle all balances first." });
    }
    if (await recentManualStatement(group._id, MANUAL_COOLDOWN_MS))
      return res.status(429).json({ message: "The statement was just sent. Please wait a few minutes before sending again." });

    const r = await queueGroupStatement(groupId, { reason: "manual", triggeredBy: { userId: req.user.id, name: req.user.name } });
    if (!r.queued) {
      const why = { "no-expenses": "This group has no expenses yet.", "no-recipients": "No member has an email address." }[r.skipped];
      return res.status(why ? 400 : 500).json({ message: why || "Could not queue the statement." });
    }
    res.status(202).json({ success: true, batchId: r.batchId, recipients: r.recipients, message: `Statement is being emailed to ${r.recipients} member(s).` });
  } catch (err) {
    console.error("resendGroupReport error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delivery status of the group's statement emails. Every member can see who
// has received it; only the creator sees addresses and error details.
export const getGroupReportStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId, "members createdBy");
    if (!group) return res.status(404).json({ message: "Group not found" });
    const creator = isCreator(group, req.user);
    if (!creator && !isMember(group, req.user.id)) return res.status(403).json({ message: "Not a member of this group." });
    res.json(await getGroupStatementStatus(group._id, { includeEmails: creator }));
  } catch (err) {
    console.error("getGroupReportStatus error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Creator retries the members the last statement could not reach.
export const retryGroupReport = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId, "members createdBy");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isCreator(group, req.user)) return res.status(403).json({ message: "Only the creator can retry the statement." });
    const retried = await retryFailedStatement(group._id);
    if (!retried) return res.status(400).json({ message: "There are no failed statement emails to retry." });
    res.status(202).json({ success: true, retried, message: `Retrying ${retried} email(s).` });
  } catch (err) {
    console.error("retryGroupReport error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGroupIcon = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const { icon } = req.body;

    if (icon !== null && !isValidGroupIcon(icon)) {
      return res.status(400).json({ field: "icon", message: "Invalid icon selection." });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user)) {
      return res.status(403).json({ message: "Only the creator can change the group icon" });
    }

    group.icon = icon;
    // A custom photo and a picked icon are mutually exclusive display
    // choices - picking an icon clears any uploaded photo.
    if (group.photo?.public_id) {
      await cloudinary.uploader.destroy(group.photo.public_id).catch(() => {});
    }
    group.photo = { url: "", public_id: "" };
    await group.save();
    void notifyGroupChange(req.app?.get?.("io"), group._id, "settings", group.members.map(String));

    res.json({ success: true, group });
  } catch (err) {
    console.error("updateGroupIcon error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

export const uploadGroupPhoto = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { file } = req.body; // base64 string from frontend

    if (!file) return res.status(400).json({ message: "No file received" });
    const rejection = uploadRejectionReason(file, IMAGE_MIME_TYPES);
    if (rejection) return res.status(400).json({ message: rejection });
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user)) {
      return res.status(403).json({ message: "Only the creator can change the group photo" });
    }

    if (group.photo?.public_id) {
      await cloudinary.uploader.destroy(group.photo.public_id).catch(() => {});
    }

    const result = await cloudinary.uploader.upload(file, {
      folder: "splitease_group_photos",
      resource_type: "image",
    });

    group.photo = { url: result.secure_url, public_id: result.public_id };
    // A photo takes over the avatar slot, so clear the picked icon too.
    group.icon = null;
    await group.save();
    void notifyGroupChange(req.app?.get?.("io"), group._id, "settings", group.members.map(String));

    res.json({ success: true, group });
  } catch (err) {
    console.error("uploadGroupPhoto error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

export const removeGroupPhoto = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user)) {
      return res.status(403).json({ message: "Only the creator can change the group photo" });
    }

    if (group.photo?.public_id) {
      await cloudinary.uploader.destroy(group.photo.public_id).catch(() => {});
    }
    group.photo = { url: "", public_id: "" };
    await group.save();
    void notifyGroupChange(req.app?.get?.("io"), group._id, "settings", group.members.map(String));

    res.json({ success: true, group });
  } catch (err) {
    console.error("removeGroupPhoto error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

// Everything a group owns, removed together. Shared by the delete endpoint and Autopilot.
// Inside a transaction the deletes run one after another (a session can't run them in parallel).
export async function deleteGroupCore(groupId, { session = null } = {}) {
  const ops = [
    () => Expense.deleteMany({ groupId }, { session }),
    () => GroupMessage.deleteMany({ groupId }, { session }),
    () => Notepad.deleteMany({ groupId }, { session }),
    () => GroupInvite.deleteMany({ groupId }, { session }),
    () => Notification.deleteMany({ link: `/groups/${groupId}` }, { session }),
    () => Group.deleteOne({ _id: groupId }, { session }),
  ];
  if (!session) return Promise.all(ops.map((op) => op()));
  for (const op of ops) await op();
}

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const uid = asId(req.user);

    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user)) {
      return res.status(403).json({ message: "Only the trip creator can delete this trip" });
    }

    const memberIdsBeforeDelete = group.members.map(String);
    await deleteGroupCore(groupId);
    // Unsent statement emails for a deleted group are dropped.
    void cancelGroupStatements(groupId);

    void notifyGroupChange(req.app?.get?.("io"), groupId, "deleted", memberIdsBeforeDelete);
    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (err) {
    console.error("deleteGroup error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

export const generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group ID" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only creator can generate invite" });

    const joinLink = await ensureInviteLink(group, { reset: req.body?.reset === true });
    res.json({
      success: true,
      inviteCode: group.inviteCode,
      joinLink,
      // Ready-made links per channel (see utils/publicUrl.js). Older clients keep using joinLink.
      links: inviteLinks(group.inviteCode),
      expiresAt: group.inviteExpiresAt,
      joinApproval: !!group.settings?.joinApproval,
      groupName: group.name,
      groupType: group.groupType,
      memberCount: group.members?.length || 0,
    });
  } catch (err) {
    console.error("generateInviteLink error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

// POST /api/groups/:groupId/invite/reset - old link stops working immediately.
export const resetInviteLink = async (req, res) => {
  req.body = { ...(req.body || {}), reset: true };
  return generateInviteLink(req, res);
};

// Machine-readable reasons so web and app can show the right screen without
// parsing message text.
const INVITE_INVALID = { code: "INVITE_INVALID", message: "This invite link is invalid or has been reset. Ask for a new one." };
const INVITE_EXPIRED = { code: "INVITE_EXPIRED", message: "This invite link has expired. Ask for a new one." };

// GET /api/groups/invite/:inviteCode - public. What an invite points to, so
// the join screen can show "Gautam invited you to Goa Trip" before sign-in,
// and say up front when a link is dead. Only what the invite itself reveals:
// no member names, no amounts.
export const previewInvite = async (req, res) => {
  try {
    const inviteCode = normalizeInviteCode(req.params.inviteCode);
    if (typeof inviteCode !== "string" || !/^[A-Za-z0-9_-]{4,64}$/.test(inviteCode))
      return res.status(404).json(INVITE_INVALID);

    const group = await Group.findOne({ inviteCode })
      .select("name groupType icon photo members createdBy inviteExpiresAt settings.joinApproval isCompleted")
      .lean();
    if (!group) return res.status(404).json(INVITE_INVALID);
    if (group.inviteExpiresAt && group.inviteExpiresAt < new Date()) return res.status(410).json(INVITE_EXPIRED);

    const creatorId = String(group.createdBy || "");
    const creator = mongoose.Types.ObjectId.isValid(creatorId)
      ? await User.findById(creatorId).select("name").lean().catch(() => null)
      : null;

    res.setHeader("Cache-Control", "no-store");
    res.json({
      code: inviteCode,
      group: {
        name: group.name,
        type: group.groupType || "general",
        icon: group.icon || null,
        photo: group.photo?.url || "",
        memberCount: (group.members || []).length,
        completed: !!group.isCompleted,
      },
      invitedBy: String(creator?.name || "").trim().slice(0, 60) || null,
      expiresAt: group.inviteExpiresAt || null,
      joinApproval: !!group.settings?.joinApproval,
    });
  } catch (err) {
    console.error("previewInvite error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

export const joinGroupByInvite = async (req, res) => {
  try {
    const inviteCode = normalizeInviteCode(req.params.inviteCode);
    const uid = req.user.id;
    if (typeof inviteCode !== "string" || !/^[A-Za-z0-9_-]{4,64}$/.test(inviteCode))
      return res.status(404).json(INVITE_INVALID);

    let group = await Group.findOne({ inviteCode });
    if (!group) return res.status(404).json(INVITE_INVALID);
    if (group.inviteExpiresAt && group.inviteExpiresAt < new Date())
      return res.status(410).json(INVITE_EXPIRED);

    const wasAlreadyMember = group.members.map(String).includes(String(uid));

    // Blocked by the creator: behave like a dead link.
    if (!wasAlreadyMember) {
      const creator = await User.findById(group.createdBy).select("blockedUsers").lean().catch(() => null);
      if ((creator?.blockedUsers || []).map(String).includes(String(uid)))
        return res.status(404).json(INVITE_INVALID);
    }

    // Approval-required groups: file a join request instead of joining.
    if (!wasAlreadyMember && group.settings?.joinApproval && !isCreator(group, req.user)) {
      await GroupInvite.findOneAndUpdate(
        { groupId: group._id, userId: uid, status: "pending" },
        { $set: { kind: "request", invitedBy: null, expiresAt: new Date(Date.now() + INVITE_TTL_MS) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      // Creator's pending-requests list updates live.
      void notifyGroupChange(req.app?.get?.("io"), group._id, "invite");
      if (mongoose.Types.ObjectId.isValid(String(group.createdBy))) {
        void createNotification(
          [group.createdBy],
          `${req.user.name} asked to join "${group.name}"`,
          `/groups/${group._id}`,
          "group",
          { groupName: group.name, groupId: group._id }
        );
      }
      return res.status(202).json({
        success: true,
        pending: true,
        status: "requested",
        message: "Request sent. You'll be added once the group creator approves.",
        group: { _id: group._id, name: group.name },
      });
    }

    // Add user to group if not already member - use $addToSet for atomicity
    if (!wasAlreadyMember) {
      await Group.findByIdAndUpdate(group._id, { $addToSet: { members: uid } });
      group = await Group.findById(group._id);
      void notifyGroupChange(req.app?.get?.("io"), group._id, "member");

      // Notify other members
      const otherMembers = group.members.map(String).filter((id) => id !== String(uid));
      if (otherMembers.length > 0) {
        void createNotification(
          otherMembers,
          `${req.user.name} joined "${group.name}" using an invite link`,
          `/groups/${group._id}`,
          "group",
          { groupName: group.name, groupId: group._id }
        );
      }
    }

    const populated = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      status: wasAlreadyMember ? "already_member" : "joined",
      alreadyMember: wasAlreadyMember,
      message: wasAlreadyMember ? "You're already in this group" : "Joined group successfully",
      group: populated,
    });
  } catch (err) {
    console.error("joinGroupByInvite error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};
