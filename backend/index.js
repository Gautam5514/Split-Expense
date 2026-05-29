import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import admin from "./config/firebaseAdmin.js";
import jwt from "jsonwebtoken";
import User from "./models/userModel.js";

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

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);

// -----------------------------------------
//  CORS
// -----------------------------------------
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
};

// Handle preflight OPTIONS requests for all routes (required for DELETE/PUT from browsers)
app.options("*", cors(corsOptions));

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// -----------------------------------------
//  SOCKET.IO LOGIC
// -----------------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // When client sends token
  socket.on("register", async (token) => {
    try {
      if (!token) return;

      let userId = null;

      // Verify Firebase ID token — the only accepted credential.
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
    } catch (err) {
      console.error("❌ register error:", err.message);
    }
  });

  // -----------------------------------------
  // Join conversation
  // -----------------------------------------
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  // Typing
  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(conversationId).emit("typing", userId);
  });

  // Messages
  socket.on("sendMessage", (data) => {
    io.to(data.conversationId).emit("newMessage", data);
  });

  // -----------------------------------------
  // Groups
  // -----------------------------------------
  socket.on("joinGroup", (groupId) => socket.join(`group:${groupId}`));
  socket.on("leaveGroup", (groupId) => socket.leave(`group:${groupId}`));

  socket.on("groupTyping", ({ groupId, userId }) => {
    socket.to(`group:${groupId}`).emit("groupTyping", userId);
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
app.use("/api/expenses", expenseRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notepads", notepadeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

// -----------------------------------------
//  START SERVER
// -----------------------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
