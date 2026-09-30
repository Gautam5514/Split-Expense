import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import admin from "./config/firebaseAdmin.js";
import jwt from "jsonwebtoken";
import User from "./models/userModel.js";
import Conversation from "./models/conversationModel.js";
import Message from "./models/messageModel.js";
import Group from "./models/groupModel.js";
import { mongoSanitize } from "./middleware/sanitize.js";
import { buildAllowedOrigins, makeCorsOriginCallback } from "./utils/corsConfig.js";
import { canRelayToRoom } from "./utils/socketGuards.js";
import { assertSecurityConfiguration } from "./utils/securityConfig.js";
import { isValidObjectId } from "./middleware/validate.js";
import { sanitizeServerErrors } from "./middleware/errorSanitizer.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import balanceRoutes from "./routes/balanceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notepadeRoutes from "./routes/notepadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import careerRoutes from "./routes/careerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mcpRoutes from "./routes/mcpRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import fxRoutes from "./routes/fxRoutes.js";
import quickSplitRoutes from "./routes/quickSplitRoutes.js";
import { startRecurringRunner } from "./utils/recurringRunner.js";

dotenv.config();
assertSecurityConfiguration();
connectDB();

const app = express();
const server = createServer(app);

// -----------------------------------------
//  TRUST PROXY
//  Rate limiters key on req.ip. Behind a load balancer (Render, Railway,
//  Nginx, Cloudflare...) req.ip is the proxy's address unless Express is told
//  how many proxy hops to trust - then EVERY user shares one rate-limit
//  bucket (one attacker can lock everyone out of login). Trusting too many
//  hops is the opposite bug: clients can spoof X-Forwarded-For and dodge the
//  limits entirely. So this is explicit: TRUST_PROXY = number of proxy hops
//  in front of the app (usually 1). Unset = trust none (direct exposure).
// -----------------------------------------
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY ?? "", 10);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}
app.disable("x-powered-by");

// -----------------------------------------
//  SECURITY HEADERS (HELMET)
// -----------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // API server: avoid CSP conflicts with frontend static assets
  })
);

// -----------------------------------------
//  CORS — explicit allow-list built from FRONTEND_URL (comma-separated).
//  credentials: true means we must not reflect an arbitrary Origin back -
//  only origins we actually control get access with credentials attached.
// -----------------------------------------
const allowedOrigins = buildAllowedOrigins(process.env.FRONTEND_URL);
console.log("CORS allowed origins:", allowedOrigins.join(", "));

const corsOptions = {
  origin: makeCorsOriginCallback(allowedOrigins),
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-SplitEase-Token",
    "Mcp-Session-Id",
    "Mcp-Protocol-Version",
    "Accept",
  ],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  exposedHeaders: ["Mcp-Session-Id"],
};

// Handle preflight OPTIONS requests for all routes (required for DELETE/PUT from browsers)
app.options("*", cors(corsOptions));

app.use(cors(corsOptions));

app.use(sanitizeServerErrors);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -----------------------------------------
//  NOSQL INJECTION SANITIZATION
// -----------------------------------------
app.use(mongoSanitize);

// -----------------------------------------
//  SOCKET.IO INIT
// -----------------------------------------
export const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make socket instance available to controllers
app.set("io", io);

// Track online users
export const onlineUsers = new Map();

const markPendingDelivered = async (userId) => {
  const convoIds = await Conversation.find({ members: userId }).distinct("_id");
  if (!convoIds.length) return;
  const pending = {
    conversationId: { $in: convoIds },
    sender: { $ne: userId },
    deliveredTo: { $ne: userId },
  };
  const affected = await Message.distinct("conversationId", pending);
  if (!affected.length) return;
  await Message.updateMany(pending, { $addToSet: { deliveredTo: userId } });
  for (const cid of affected) {
    io.to(String(cid)).emit("messagesDelivered", { conversationId: String(cid), deliveredTo: String(userId) });
  }
};

// -----------------------------------------
//  SOCKET.IO LOGIC
// -----------------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // When client sends token
  socket.on("register", async (token) => {
    try {
      if (typeof token !== "string" || !token || token.length > 4096) return;

      let userId = null;

      // Verify Firebase ID token - the only accepted credential.
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        const user = await User.findOne({ email: decoded.email });
        if (user) userId = user._id.toString();
      } catch {
        console.log("❌ Invalid Firebase token on socket register");
        return;
      }

      if (!userId) {
        console.log("❌ User not found for socket register");
        return;
      }

      // Attach userId to socket so room-join handlers can verify membership
      socket.userId = String(userId);

      // Mark online
      onlineUsers.set(String(userId), socket.id);

      // 🔥 Update database status
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
      });

      // Broadcast online
      io.emit("userStatus", {
        userId,
        online: true,
        lastActive: null,
      });

      console.log(`🟢 User ${userId} is ONLINE`);

      // Delivery receipts: everything sent to this user while they were offline
      // has now reached their device. Mark it and tell the senders (who are in
      // the conversation room if they have that chat open) so their single
      // grey tick becomes a double grey tick.
      markPendingDelivered(userId).catch((err) =>
        console.error("❌ delivery receipts error:", err.message)
      );
    } catch (err) {
      console.error("❌ register error:", err.message);
    }
  });

  // -----------------------------------------
  // Join conversation - verify membership before allowing
  // -----------------------------------------
  socket.on("joinConversation", async (conversationId) => {
    if (!socket.userId || !isValidObjectId(conversationId)) return;
    try {
      const convo = await Conversation.findOne({
        _id: conversationId,
        members: socket.userId,
      }).select("_id").lean();
      if (convo) socket.join(conversationId);
    } catch {
      // Invalid ID format or DB error - silently ignore
    }
  });

  // Typing - only relay into rooms this socket has already been verified
  // into via joinConversation (which checks Conversation membership). The
  // identity broadcast is ALWAYS the authenticated socket.userId - a
  // client-supplied userId in the payload is ignored, so nobody can make it
  // look like someone else is typing.
  socket.on("typing", (payload) => {
    const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId : null;
    if (!canRelayToRoom(socket, conversationId)) return;
    socket.to(conversationId).emit("typing", socket.userId);
  });

  // sendMessage - the REST endpoint (POST /api/chat/message) already persists
  // the message and broadcasts the authoritative DB copy as "newMessage" to
  // the room. This event used to re-broadcast whatever object the client
  // sent, which let any room member forge messages (fake sender, text, media
  // URL) that other clients rendered as real. It is now a verified no-op kept
  // for backward compatibility with older clients that still emit it.
  socket.on("sendMessage", (data) => {
    if (!canRelayToRoom(socket, typeof data?.conversationId === "string" ? data.conversationId : null)) return;
    // Intentionally not re-broadcast: see comment above.
  });

  // -----------------------------------------
  // Groups
  // -----------------------------------------
  // joinGroup - verify membership before allowing
  socket.on("joinGroup", async (groupId) => {
    if (!socket.userId || !isValidObjectId(groupId)) return;
    try {
      const group = await Group.findOne({
        _id: groupId,
        members: socket.userId,
      }).select("_id").lean();
      if (group) socket.join(`group:${groupId}`);
    } catch {
      // Invalid ID format or DB error - silently ignore
    }
  });

  socket.on("leaveGroup", (groupId) => {
    if (isValidObjectId(groupId)) socket.leave(`group:${groupId}`);
  });

  socket.on("groupTyping", (payload) => {
    const groupId = isValidObjectId(payload?.groupId) ? String(payload.groupId) : null;
    if (!canRelayToRoom(socket, groupId ? `group:${groupId}` : null)) return;
    socket.to(`group:${groupId}`).emit("groupTyping", socket.userId);
  });

  // -----------------------------------------
  // DISCONNECT → last seen logic
  // -----------------------------------------
  socket.on("disconnect", async () => {
    console.log("🔴 Client disconnected:", socket.id);

    for (const [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(userId);

        // 🔥 Save lastActive timestamp in DB
        const lastActiveTime = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastActive: lastActiveTime,
        });

        // 🔴 Broadcast offline + lastActive
        io.emit("userStatus", {
          userId,
          online: false,
          lastActive: lastActiveTime,
        });

        console.log(`🔻 User ${userId} is OFFLINE`);
      }
    }
  });
});

// -----------------------------------------
//  ROUTES
// -----------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/fx", fxRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/quick-splits", quickSplitRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notepads", notepadeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/admin", adminRoutes);

// Remote MCP endpoint (Streamable HTTP). Mounted at the top level so the URL is
// simply <origin>/mcp — the address users paste into ChatGPT / Claude.
app.use("/mcp", mcpRoutes);

// -----------------------------------------
//  GLOBAL ERROR HANDLER
//  Must be defined after all routes.
//  4-argument signature is required by Express to recognise it as an error handler.
// -----------------------------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    // Never leak stack traces or internal details to the client on 500s
    message: status < 500 ? err.message : "Something went wrong. Please try again.",
  });
});

// -----------------------------------------
//  START SERVER
// -----------------------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Monthly bills (Roommates groups). Skipped under tests.
  if (process.env.NODE_ENV !== "test") startRecurringRunner();
});
