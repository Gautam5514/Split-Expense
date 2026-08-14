import Group from "../models/groupModel.js";
import GroupMessage from "../models/groupMessageModel.js";
import cloudinary from "../config/cloudinary.js";
import UserProfile from "../models/userProfileModel.js";
import User from "../models/userModel.js";
import { sendPushToUsers } from "./notificationController.js";
import { chatPushBody, usersViewingRoom } from "./chatController.js";

/**
 * ✅ GET /api/groups/:groupId/messages
 */
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.map(String).includes(String(uid)))
      return res.status(403).json({ message: "Not a member of this group" });

    await User.findByIdAndUpdate(uid, {
      $pull: { hiddenGroupChats: group._id },
    });

    // Mark all existing group messages as seen by the current user
    await GroupMessage.updateMany(
      { groupId, seenBy: { $ne: uid } },
      { $addToSet: { seenBy: uid } }
    );

    // Emit group messages seen socket signal
    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("groupMessagesSeen", { groupId, userId: uid });
    }

    const messages = await GroupMessage.find({ groupId })
      .populate("sender", "name email photoURL")
      .sort({ createdAt: 1 })
      .lean();

    // Attach imageUrl (Google or manual)
    const senderIds = [...new Set(messages.map((m) => m.sender?._id))];
    const profiles = await UserProfile.find({
      userId: { $in: senderIds },
    }).select("userId profileImage.url");
    const map = {};
    profiles.forEach((p) => (map[p.userId.toString()] = p.profileImage?.url));

    const finalMsgs = messages.map((m) => ({
      ...m,
      sender: {
        ...m.sender,
        imageUrl: m.sender?.photoURL || map[m.sender?._id?.toString()] || null,
      },
    }));

    res.json(finalMsgs);
  } catch (err) {
    console.error("getGroupMessages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ POST /api/groups/:groupId/message
 * body: { text, file (base64 optional) }
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, file } = req.body;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.map(String).includes(String(uid)))
      return res.status(403).json({ message: "Not a member of this group" });

    await User.findByIdAndUpdate(uid, {
      $pull: { hiddenGroupChats: group._id },
    });

    let mediaData = null;

    if (file) {
      const uploaded = await cloudinary.uploader.upload(file, {
        folder: "splitwise_group_chat",
        resource_type: "auto",
      });
      mediaData = {
        url: uploaded.secure_url,
        type: uploaded.resource_type,
      };
    }

    const msg = await GroupMessage.create({
      groupId,
      sender: uid,
      text: text || "",
      mediaUrl: mediaData?.url || null,
      mediaType: mediaData?.type || null,
      seenBy: [uid],
    });

    // update group's lastMessage & updatedAt
    group.lastMessage = text || (mediaData ? "📎 Media" : "");
    group.lastMessageAt = new Date();
    await group.save();

    // populate sender for response
    const populated = await GroupMessage.findById(msg._id)
      .populate("sender", "name email photoURL")
      .lean();

    // add imageUrl for sender
    const profile = await UserProfile.findOne({
      userId: populated.sender._id,
    }).select("profileImage.url");

    populated.sender.imageUrl =
      populated.sender.photoURL || profile?.profileImage?.url || null;

    res.json(populated);

    // emit socket event
    const io = req.app.get("io");
    if (io) io.to(`group:${groupId}`).emit("newGroupMessage", populated);

    // Push to members not actively viewing this group chat (fire-and-forget,
    // after the response so it never adds latency to the send).
    const viewing = usersViewingRoom(io, `group:${groupId}`);
    const pushRecipients = group.members
      .map(String)
      .filter((m) => m !== String(uid) && !viewing.has(m));

    if (pushRecipients.length) {
      sendPushToUsers(pushRecipients, {
        title: group.name || "Group chat",
        body: `${req.user.name ? `${req.user.name}: ` : ""}${chatPushBody(text, !!mediaData)}`,
        data: {
          link: "/groupchat",
          type: "group-chat",
          groupId: String(groupId),
          groupName: group.name || "",
        },
      }).catch((err) => console.error("group chat push error:", err.message));
    }
  } catch (err) {
    console.error("sendGroupMessage error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGroupChats = async (req, res) => {
  try {
    const uid = req.user.id;
    const { groupIds = [] } = req.body;

    const ids = [...new Set(groupIds.map(String).filter(Boolean))];
    if (!ids.length) {
      return res.status(400).json({ message: "No group chats selected" });
    }

    const groups = await Group.find({
      _id: { $in: ids },
      members: uid,
    }).select("_id");

    const allowedGroupIds = groups.map((g) => g._id);
    if (allowedGroupIds.length) {
      await User.findByIdAndUpdate(uid, {
        $addToSet: { hiddenGroupChats: { $each: allowedGroupIds } },
      });
    }

    res.json({
      success: true,
      hidden: allowedGroupIds.length,
      groupIds: allowedGroupIds.map(String),
    });
  } catch (err) {
    console.error("deleteGroupChats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ POST /api/groups/:groupId/mark-seen
 */
export const markGroupMessagesSeen = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.map(String).includes(String(uid)))
      return res.status(403).json({ message: "Not a member of this group" });

    // Mark all group messages as read by me
    await GroupMessage.updateMany(
      { groupId, seenBy: { $ne: uid } },
      { $addToSet: { seenBy: uid } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("groupMessagesSeen", { groupId, userId: uid });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("markGroupMessagesSeen error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

