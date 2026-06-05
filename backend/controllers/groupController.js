import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import { isValidEmail } from "../middleware/validate.js";
import Expense from "../models/expenseModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import Notepad from "../models/notepadModel.js";
import Notification from "../models/notification.model.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";
import UserProfile from "../models/userProfileModel.js";
import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js";

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
    const { name, groupType } = req.body;
    if (!name?.trim())
      return res.status(400).json({ field: "name", message: "Group name is required." });
    if (name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Group name must be at least 2 characters." });
    if (name.trim().length > 100)
      return res.status(400).json({ field: "name", message: "Group name must be under 100 characters." });

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.create({
      name: name.trim(),
      createdBy: uid,
      members: [uid],
      groupType: groupType || "trip",
    });

    const populated = await Group.findById(group._id).populate(
      "members",
      "name email"
    );
    res.status(201).json(populated);
  } catch (err) {
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

    // Collect ALL unique member IDs across all groups — then 2 queries total
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

export const addMembersByEmail = async (req, res) => {
  try {
    const { emails } = req.body;
    const { groupId } = req.params;
    const uid = req.user?.id || req.user?._id?.toString();

    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ field: "emails", message: "Please provide at least one email address." });
    if (emails.length > 20)
      return res.status(400).json({ field: "emails", message: "You can add at most 20 members at a time." });
    const invalidEmails = emails.filter((e) => !isValidEmail(e));
    if (invalidEmails.length)
      return res.status(400).json({
        field: "emails",
        message: `Invalid email format: ${invalidEmails.slice(0, 3).join(", ")}`,
      });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only the group creator can add members." });

    const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

    // Split into registered vs unregistered
    const registeredUsers = await User.find(
      { email: { $in: normalizedEmails } },
      "_id email name"
    );
    const registeredEmails = new Set(registeredUsers.map((u) => u.email));
    const unregisteredEmails = normalizedEmails.filter((e) => !registeredEmails.has(e));

    // Add registered users to group
    let updated = null;
    if (registeredUsers.length > 0) {
      const userIds = registeredUsers.map((u) => new mongoose.Types.ObjectId(u._id));

      if (!group.members.map(String).includes(String(group.createdBy))) {
        group.members.push(group.createdBy);
      }
      group.members = Array.from(
        new Set([...group.members.map(String), ...userIds.map(String)])
      ).map((id) => new mongoose.Types.ObjectId(id));
      await group.save();

      updated = await Group.findById(groupId)
        .populate("members", "name email")
        .populate("createdBy", "name email");

      await createNotification(
        userIds,
        `You were added to group "${group.name}" by ${req.user.name}`,
        `/groups/${group._id}`,
        "group"
      );

      const existingMemberIds = group.members
        .map(String)
        .filter((id) => !userIds.map(String).includes(id) && id !== String(uid));
      if (existingMemberIds.length > 0) {
        const addedNames = registeredUsers.map((u) => u.name || u.email).join(", ");
        await createNotification(
          existingMemberIds,
          `${req.user.name} added ${addedNames} to "${group.name}"`,
          `/groups/${group._id}`,
          "group"
        );
      }
    }

    // Send invitation emails to unregistered addresses
    if (unregisteredEmails.length > 0) {
      // Ensure group has an invite code
      if (!group.inviteCode) {
        group.inviteCode = crypto.randomBytes(4).toString("hex");
        await group.save();
      }

      const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
      const joinLink = `${frontendUrl}/join/${group.inviteCode}`;
      const inviterName = req.user.name || "A friend";

      const emailPromises = unregisteredEmails.map((email) =>
        sendEmail({
          to: email,
          subject: `${inviterName} invited you to split expenses on SplitEase`,
          html: buildInviteEmailHtml({ inviterName, groupName: group.name, joinLink, email }),
        }).catch((err) => console.error(`Failed to send invite to ${email}:`, err.message))
      );
      await Promise.all(emailPromises);
    }

    // Build response
    const finalGroup = updated || await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json({
      group: finalGroup,
      added: registeredUsers.length,
      invited: unregisteredEmails.length,
      invitedEmails: unregisteredEmails,
    });
  } catch (err) {
    console.error("❌ addMembersByEmail:", err.message);
    res.status(500).json({ message: err.message });
  }
};

function buildInviteEmailHtml({ inviterName, groupName, joinLink, email }) {
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
                <strong style="color:#0891B2;">"${groupName}"</strong> on SplitEase — the easiest way to track and split shared expenses with friends.
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
                    <td style="padding:4px 0;font-size:13px;color:#475569;">💡 &nbsp;Smart settlements — pay the fewest people</td>
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

export const listAvailableUsers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q = "", limit = 20, page = 1 } = req.query;

    // 🟢 Fetch group members to exclude them
    const group = await Group.findById(groupId, "members");
    if (!group) return res.status(404).json({ message: "Group not found." });

    // 🔍 Search filter (by name or email)
    const filter = {
      _id: { $nin: group.members },
      $or: [{ email: new RegExp(q, "i") }, { name: new RegExp(q, "i") }],
    };

    // 🧠 Fetch users from User collection
    const users = await User.find(filter, "name email photoURL createdAt")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .skip(((Number(page) || 1) - 1) * (Number(limit) || 20))
      .lean();

    // 🧩 Fetch corresponding manual profile images (only for these users)
    const userIds = users.map((u) => u._id);
    const profiles = await UserProfile.find({
      userId: { $in: userIds },
    }).select("userId profileImage.url");

    const profileMap = profiles.reduce((acc, p) => {
      acc[String(p.userId)] = p.profileImage?.url || null;
      return acc;
    }, {});

    // 🧠 Merge both sources of image (Google photoURL > manual upload > null)
    const enriched = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      photoURL: u.photoURL || profileMap[String(u._id)] || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("listAvailableUsers error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const markGroupCompleted = async (req, res) => {
  try {
    const { groupId } = req.params;
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
      await createNotification(
        otherMembers,
        `"${group.name}" has been marked as completed by ${req.user.name}`,
        `/groups/${group._id}`,
        "group"
      );
    }

    res.json({ success: true, message: "Trip marked as completed", group });
  } catch (err) {
    console.error("markGroupCompleted error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
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
      Notification.deleteMany({ link: `/groups/${groupId}` }),
      Group.deleteOne({ _id: groupId }),
    ]);

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (err) {
    console.error("deleteGroup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only creator can generate invite" });

    // If inviteCode doesn’t exist, generate one
    if (!group.inviteCode) {
      group.inviteCode = crypto.randomBytes(4).toString("hex");
      await group.save();
    }

    const frontendUrl = (process.env.FRONTEND_URL || "https://splitease.app").split(",")[0].trim();
    const joinLink = `${frontendUrl}/join/${group.inviteCode}`;

    res.json({
      success: true,
      inviteCode: group.inviteCode,
      joinLink,
    });
  } catch (err) {
    console.error("generateInviteLink error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 🟩 POST /api/groups/join/:inviteCode
 * Join group by invite link
 */
export const joinGroupByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const uid = req.user.id;

    let group = await Group.findOne({ inviteCode });
    if (!group) return res.status(404).json({ message: "Invalid invite link" });

    // Add user to group if not already member — use $addToSet for atomicity
    const wasAlreadyMember = group.members.map(String).includes(String(uid));
    if (!wasAlreadyMember) {
      await Group.findByIdAndUpdate(group._id, { $addToSet: { members: uid } });
      group = await Group.findById(group._id);

      // Notify other members
      const otherMembers = group.members.map(String).filter((id) => id !== String(uid));
      if (otherMembers.length > 0) {
        await createNotification(
          otherMembers,
          `${req.user.name} joined "${group.name}" using an invite link`,
          `/groups/${group._id}`,
          "group"
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
    res.status(500).json({ message: "Server error" });
  }
};
