import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";
import UserProfile from "../models/userProfileModel.js";
import crypto from "crypto";
import QRCode from "qrcode";

// Helper utilities
const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());
const sameId = (a, b) => String(a) === String(b);
const isMember = (group, userId) =>
  (group.members || []).some((m) => String(m) === String(userId));

export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Group name is required." });

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.create({
      name: name.trim(),
      createdBy: uid,
      members: [uid],
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
 * 🧩 Utility: Enrich members with photoURL from Google or manual profile upload
 */
const enrichMembersWithImages = async (members) => {
  const memberIds = members.map((m) => m._id);

  // Fetch corresponding UserProfile entries
  const profiles = await UserProfile.find({
    userId: { $in: memberIds },
  }).select("userId profileImage.url");

  const profileMap = profiles.reduce((acc, p) => {
    acc[String(p.userId)] = p.profileImage?.url || null;
    return acc;
  }, {});

  // Merge Google photoURL or manual profile URL
  const users = await User.find({ _id: { $in: memberIds } }).select(
    "photoURL email name"
  );

  const userMap = users.reduce((acc, u) => {
    acc[String(u._id)] = u.photoURL || profileMap[String(u._id)] || null;
    return acc;
  }, {});

  // Attach to members
  return members.map((m) => ({
    ...m,
    photoURL: userMap[String(m._id)] || null,
  }));
};

/**
 * ✅ GET /api/groups
 */
export const getGroups = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?._id?.toString();
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const groups = await Group.find({
      members: new mongoose.Types.ObjectId(uid),
    })
      .sort({ updatedAt: -1 })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();

    // Enrich members with images
    const enrichedGroups = await Promise.all(
      groups.map(async (g) => {
        const isCreator =
          String(g.createdBy?._id || g.createdBy) === String(uid);

        const enrichedMembers = await enrichMembersWithImages(g.members || []);

        return {
          ...g,
          members: enrichedMembers,
          status: isCreator ? "active" : "inactive",
        };
      })
    );

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

    // Auto-heal: ensure creator is in members
    if (!memberIds.includes(creatorId)) {
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: creatorId } }
      );
    }

    // Enrich members with profile images
    const enrichedMembers = await enrichMembersWithImages(group.members || []);

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

    // 1️⃣ Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "emails[] required." });
    }

    // 2️⃣ Find the group
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const uid = asId(req.user);
    if (!sameId(group.createdBy, uid)) {
      return res
        .status(403)
        .json({ message: "Only the group creator can add members." });
    }

    // 3️⃣ Find users by email
    const users = await User.find(
      { email: { $in: emails.map((e) => e.toLowerCase().trim()) } },
      "_id email"
    );

    if (!users.length) {
      return res.status(404).json({ message: "No matching users found." });
    }

    // 4️⃣ Convert all IDs to proper ObjectId (important!)
    const userIds = users.map((u) => new mongoose.Types.ObjectId(u._id));

    // 🟢 FIX 1: Make sure the creator is always in members
    if (!group.members.map(String).includes(String(group.createdBy))) {
      group.members.push(group.createdBy);
    }

    // 🟢 FIX 2: Add new members properly in-memory (not just updateOne)
    group.members = Array.from(
      new Set([...group.members.map(String), ...userIds.map(String)])
    ).map((id) => new mongoose.Types.ObjectId(id));

    await group.save();

    // ✅ Re-fetch with populated data
    const updated = await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    // Notify new members
    await createNotification(
      userIds,
      `You were added to group "${group.name}" by ${req.user.name}`,
      `/groups/${group._id}`,
      "group"
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ addMembersByEmail:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const uid = asId(req.user);
    if (!sameId(group.createdBy, uid))
      return res
        .status(403)
        .json({ message: "Only the group creator can remove members." });

    if (sameId(group.createdBy, userId))
      return res
        .status(400)
        .json({ message: "Creator cannot be removed from the group." });

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

    if (String(group.createdBy) !== String(uid)) {
      return res
        .status(403)
        .json({ message: "Only the creator can mark as completed" });
    }

    group.isCompleted = true;
    await group.save();

    res.json({ success: true, message: "Trip marked as completed", group });
  } catch (err) {
    console.error("markGroupCompleted error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only creator can generate the link
    if (String(group.createdBy) !== String(uid))
      return res.status(403).json({ message: "Only creator can generate invite" });

    // If inviteCode doesn’t exist, generate one
    if (!group.inviteCode) {
      group.inviteCode = crypto.randomBytes(4).toString("hex");
      await group.save();
    }

    const joinLink = `${process.env.FRONTEND_URL || "https://splitease.app"}/join/${group.inviteCode}`;

    // Generate base64 QR code
    const qrBase64 = await QRCode.toDataURL(joinLink);

    res.json({
      success: true,
      joinLink,
      qrBase64,
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

    const group = await Group.findOne({ inviteCode });
    if (!group) return res.status(404).json({ message: "Invalid invite link" });

    // Add user to group if not already member
    if (!group.members.map(String).includes(String(uid))) {
      group.members.push(uid);
      await group.save();
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