import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import { isValidEmail, isValidObjectId, escapeRegExp, escapeHtml, normalizeEmail } from "../middleware/validate.js";
import Expense from "../models/expenseModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import Notepad from "../models/notepadModel.js";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";
import UserProfile from "../models/userProfileModel.js";
import { sendEmail, sendEmailsSafely } from "../utils/emailService.js";
import { isValidGroupIcon } from "../utils/groupIcons.js";
import { GROUP_TYPES, presetFor } from "../utils/groupPresets.js";
import { buildGroupSettingsUpdate, unflatten } from "../utils/groupSettings.js";
import GroupInvite from "../models/groupInviteModel.js";
import { generateInviteCode, isShortInviteCode, normalizeInviteCode } from "../utils/inviteCode.js";
import { searchContacts, lookupUserByEmail } from "./peopleController.js";
import { getContactIds, isBlockedBetween, inviteLinkExpiry, INVITE_TTL_MS } from "../utils/contacts.js";
import cloudinary from "../config/cloudinary.js";
import { uploadRejectionReason, IMAGE_MIME_TYPES } from "../utils/uploadSecurity.js";

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
const buildPhotoMap = async (memberIds) => {
  const ids = [...new Set(memberIds.map(String))];
  if (ids.length === 0) return new Map();

  const [profiles, users] = await Promise.all([
    UserProfile.find({ userId: { $in: ids } }).select("userId profileImage.url").lean(),
    User.find({ _id: { $in: ids } }).select("photoURL").lean(),
  ]);

  const profileMap = new Map(profiles.map((p) => [String(p.userId), p.profileImage?.url || null]));
  const photoMap   = new Map(users.map((u) => [String(u._id), u.photoURL || null]));

  // Merge: Google photoURL takes priority over manual upload
  for (const [id, url] of profileMap) {
    if (!photoMap.get(id)) photoMap.set(id, url);
  }
  return photoMap;
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

    const photoMap = await buildPhotoMap((group.members || []).map((m) => m._id));
    const enrichedMembers = (group.members || []).map((m) => ({
      ...m,
      photoURL: photoMap.get(String(m._id)) || null,
    }));

    res.json({
      ...group,
      members: enrichedMembers,
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

    const normalizedEmails = [...new Set(emails.map(normalizeEmail))];
    const [registeredUsers, inviter, contactIds] = await Promise.all([
      User.find(
        { $or: [{ email: { $in: normalizedEmails } }, { _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } }] },
        "_id email name privacy blockedUsers"
      ),
      User.findById(uid).select("blockedUsers").lean(),
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
    let updated = null;
    if (direct.length > 0) {
      const userIdsToAdd = direct.map((u) => new mongoose.Types.ObjectId(u._id));
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: { $each: [group.createdBy, ...userIdsToAdd].filter((x) => mongoose.Types.ObjectId.isValid(String(x))) } } }
      );
      updated = await Group.findById(groupId)
        .populate("members", "name email")
        .populate("createdBy", "name email");

      void createNotification(
        userIdsToAdd,
        `You were added to group "${group.name}" by ${req.user.name}`,
        `/groups/${group._id}`,
        "group",
        { groupName: group.name, groupId: group._id }
      );

      const existingMemberIds = group.members
        .map(String)
        .filter((id) => !userIdsToAdd.map(String).includes(id) && id !== String(uid));
      if (existingMemberIds.length > 0) {
        const addedNames = direct.map((u) => u.name || u.email).join(", ");
        void createNotification(
          existingMemberIds,
          `${req.user.name} added ${addedNames} to "${group.name}"`,
          `/groups/${group._id}`,
          "group",
          { groupName: group.name, groupId: group._id }
        );
      }
    }

    // Invites (accept / decline)
    if (toInvite.length > 0) {
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await Promise.all(toInvite.map((u) =>
        GroupInvite.findOneAndUpdate(
          { groupId: group._id, userId: u._id, status: "pending" },
          { $set: { kind: "invite", invitedBy: uid, expiresAt } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      ));
      void createNotification(
        toInvite.map((u) => u._id),
        `${req.user.name} invited you to join "${group.name}"`,
        "/invites",
        "group",
        { groupName: group.name, groupId: group._id }
      );
    }

    // Send invitation emails to unregistered addresses
    if (unregisteredEmails.length > 0) {
      const joinLink = await ensureInviteLink(group);
      const inviterName = req.user.name || "A friend";

      // Send sequentially through the pooled transporter so a batch of invites
      // never opens a burst of parallel SMTP connections (which Gmail rejects).
      void sendEmailsSafely(
        unregisteredEmails.map((email) => ({
          to: email,
          subject: `${String(inviterName).replace(/[\r\n]+/g, " ").slice(0, 80)} invited you to split expenses on SplitEase`,
          html: buildInviteEmailHtml({ inviterName, groupName: group.name, joinLink, email }),
        }))
      );
    }

    // Build response
    const finalGroup = updated || await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json({
      group: finalGroup,
      added: direct.length,
      pending: toInvite.length + skipped,
      invited: unregisteredEmails.length,
      invitedEmails: unregisteredEmails,
    });
  } catch (err) {
    console.error("❌ addMembersByEmail:", err.message);
    res.status(500).json({ message: err.message });
  }
};

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
  const frontendUrl = (process.env.FRONTEND_URL || "https://splitease.app").split(",")[0].trim();
  return `${frontendUrl}/join/${group.inviteCode}`;
};

function buildInviteEmailHtml(params) {
  // Every interpolated value is user-controlled (display name, group name,
  // invitee address), so escape all of them - this email goes to arbitrary
  // addresses from our domain and must not be usable to inject links/HTML.
  const inviterName = escapeHtml(params.inviterName);
  const groupName = escapeHtml(params.groupName);
  const joinLink = escapeHtml(params.joinLink);
  const email = escapeHtml(params.email);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to SplitEase</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(8,145,178,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0891B2,#14b8a6);padding:32px 36px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                💸 SplitEase
              </div>
              <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px;">
                Split expenses. Stay friends.
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 24px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0B1929;">
                You've been invited! 🎉
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
                <strong style="color:#0B1929;">${inviterName}</strong> invited you to join the group
                <strong style="color:#0891B2;">"${groupName}"</strong> on SplitEase - the easiest way to track and split shared expenses with friends.
              </p>

              <!-- Group card -->
              <div style="background:#EEF6F9;border:1px solid #DCE5F0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Group</div>
                <div style="font-size:18px;font-weight:800;color:#0B1929;">${groupName}</div>
                <div style="font-size:12px;color:#64748B;margin-top:2px;">Invited by ${inviterName}</div>
              </div>

              <!-- CTA button -->
              <div style="text-align:center;margin:28px 0;">
                <a href="${joinLink}" style="display:inline-block;background:linear-gradient(135deg,#0891B2,#14b8a6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 4px 14px rgba(8,145,178,0.3);">
                  Join "${groupName}" →
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:1.6;">
                Click the button above to create your free account and you'll be automatically added to the group. No credit card required.
              </p>

              <!-- What is SplitEase -->
              <div style="border-top:1px solid #DCE5F0;margin-top:24px;padding-top:20px;">
                <div style="font-size:13px;font-weight:700;color:#0B1929;margin-bottom:10px;">What is SplitEase?</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#475569;">✅ &nbsp;Track group expenses in real-time</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#475569;">💡 &nbsp;Smart settlements - pay the fewest people</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#475569;">📊 &nbsp;See exactly who owes what</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#475569;">💬 &nbsp;Group chat built in</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F4F7FB;padding:20px 36px;text-align:center;border-top:1px solid #DCE5F0;">
              <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
                This invitation was sent to <strong>${email}</strong> by ${inviterName}.
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E1;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

    group.isCompleted = true;
    await group.save();

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

    res.json({ success: true, group });
  } catch (err) {
    console.error("removeGroupPhoto error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};

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

    await Promise.all([
      Expense.deleteMany({ groupId }),
      GroupMessage.deleteMany({ groupId }),
      Notepad.deleteMany({ groupId }),
      GroupInvite.deleteMany({ groupId }),
      Notification.deleteMany({ link: `/groups/${groupId}` }),
      Group.deleteOne({ _id: groupId }),
    ]);

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

export const joinGroupByInvite = async (req, res) => {
  try {
    const inviteCode = normalizeInviteCode(req.params.inviteCode);
    const uid = req.user.id;
    if (typeof inviteCode !== "string" || !/^[A-Za-z0-9_-]{4,64}$/.test(inviteCode))
      return res.status(404).json({ message: "Invalid invite link" });

    let group = await Group.findOne({ inviteCode });
    if (!group) return res.status(404).json({ message: "Invalid invite link" });
    if (group.inviteExpiresAt && group.inviteExpiresAt < new Date())
      return res.status(410).json({ message: "This invite link has expired. Ask for a new one." });

    const wasAlreadyMember = group.members.map(String).includes(String(uid));

    // Blocked by the creator: behave like a dead link.
    if (!wasAlreadyMember) {
      const creator = await User.findById(group.createdBy).select("blockedUsers").lean().catch(() => null);
      if ((creator?.blockedUsers || []).map(String).includes(String(uid)))
        return res.status(404).json({ message: "Invalid invite link" });
    }

    // Approval-required groups: file a join request instead of joining.
    if (!wasAlreadyMember && group.settings?.joinApproval && !isCreator(group, req.user)) {
      await GroupInvite.findOneAndUpdate(
        { groupId: group._id, userId: uid, status: "pending" },
        { $set: { kind: "request", invitedBy: null, expiresAt: new Date(Date.now() + INVITE_TTL_MS) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
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
        message: "Request sent. You'll be added once the group creator approves.",
        group: { _id: group._id, name: group.name },
      });
    }

    // Add user to group if not already member - use $addToSet for atomicity
    if (!wasAlreadyMember) {
      await Group.findByIdAndUpdate(group._id, { $addToSet: { members: uid } });
      group = await Group.findById(group._id);

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
      message: "Joined group successfully",
      group: populated,
    });
  } catch (err) {
    console.error("joinGroupByInvite error:", err.message);
    res.status(500).json({ message: "Server error", expose: true });
  }
};
