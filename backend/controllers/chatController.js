import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
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

// ✅ Get all conversations for logged-in user
export const getConversations = async (req, res) => {
  const me = req.user.id;
  const convos = await Conversation.find({ members: me })
    .populate("members", "name email photoURL")
    .sort({ updatedAt: -1 });
  res.json(convos);
};

// ✅ Get messages for a conversation
export const getMessages = async (req, res) => {
  const { id } = req.params;
  const msgs = await Message.find({ conversationId: id })
    .populate("sender", "name email photoURL")
    .sort({ createdAt: 1 });
  res.json(msgs);
};


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
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};
