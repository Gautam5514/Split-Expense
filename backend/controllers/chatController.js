import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import cloudinary from "../config/cloudinary.js";

// ✅ Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const { otherEmail } = req.body;
    const me = req.user.id;
    const other = await User.findOne({ email: otherEmail });
    if (!other) return res.status(404).json({ message: "User not found" });

    let convo = await Conversation.findOne({
      members: { $all: [me, other._id] },
    });

    if (!convo) {
      convo = await Conversation.create({ members: [me, other._id] });
    }

    res.json(convo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all conversations for logged-in user (with proper imageUrl)
export const getConversations = async (req, res) => {
  try {
    const me = req.user.id;

    // 1️⃣ Get conversations
    const convos = await Conversation.find({ members: me })
      .populate("members", "name email photoURL createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    // 2️⃣ Collect all unique member IDs (except self)
    const memberIds = [
      ...new Set(
        convos.flatMap((c) => c.members.map((m) => m._id.toString()))
      ),
    ].filter((id) => id !== me);

    // 3️⃣ Get UserProfiles for non-Google users
    const profiles = await UserProfile.find(
      { userId: { $in: memberIds } },
      "userId profileImage.url"
    ).lean();

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.userId.toString()] = p.profileImage?.url || null;
    });

    // 4️⃣ Merge image URLs for each conversation
    const enhanced = convos.map((convo) => {
      const otherMembers = convo.members.filter(
        (m) => m._id.toString() !== me
      );

      const other = otherMembers[0] || {};
      const imageUrl = other.photoURL || profileMap[other._id?.toString()] || null;

      return {
        _id: convo._id,
        members: convo.members,
        otherUser: {
          _id: other._id,
          name: other.name,
          email: other.email,
          imageUrl,
        },
        lastMessage: convo.lastMessage || "",
        lastMessageAt: convo.lastMessageAt,
        createdAt: convo.createdAt,
        updatedAt: convo.updatedAt,
      };
    });

    res.json(enhanced);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};

// ✅ Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const msgs = await Message.find({ conversationId: id })
      .populate("sender", "name email photoURL")
      .sort({ createdAt: 1 })
      .lean();

    // add imageUrl for sender (same pattern)
    const senderIds = [...new Set(msgs.map((m) => m.sender?._id?.toString()))];
    const profiles = await UserProfile.find(
      { userId: { $in: senderIds } },
      "userId profileImage.url"
    ).lean();
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.userId.toString()] = p.profileImage?.url || null;
    });

    const finalMsgs = msgs.map((m) => ({
      ...m,
      sender: {
        ...m.sender,
        imageUrl:
          m.sender?.photoURL ||
          profileMap[m.sender?._id?.toString()] ||
          null,
      },
    }));

    res.json(finalMsgs);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Send message (text or media)
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, file } = req.body;
    const sender = req.user.id;

    let mediaData = null;

    // 🟢 1️⃣ Upload base64 media if exists
    if (file) {
      const uploadResult = await cloudinary.uploader.upload(file, {
        folder: "splitwise_chat_media",
        resource_type: "auto", // allows images, videos, etc.
      });

      mediaData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
      };
    }

    // 🟢 2️⃣ Save message in DB
    const message = await Message.create({
      conversationId,
      sender,
      text: text || "",
      mediaUrl: mediaData?.url || null,
      mediaType: mediaData?.resource_type || null,
      seenBy: [sender],
    });

    // 🟢 3️⃣ Update conversation summary
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || (mediaData ? "📎 Media" : ""),
      lastMessageAt: new Date(),
    });

    // 🟢 4️⃣ Respond to client
    res.json({
      message: "Message sent successfully",
      data: message,
    });

    // 🟢 5️⃣ Emit to connected sockets in that room
    const io = req.app.get("io");
    if (io) io.to(conversationId).emit("newMessage", message);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    res.status(500).json({
      message: "Failed to send message",
      error: err.message,
    });
  }
};
