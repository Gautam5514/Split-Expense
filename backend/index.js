import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import admin from "./config/firebaseAdmin.js";
import jwt from "jsonwebtoken";
import User from "./models/userModel.js";

import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import balanceRoutes from "./routes/balanceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Socket.IO setup
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("register", async (token) => {
    try {
      if (!token) return console.log("⚠️ No token received for socket");

      let userId = null;

      // 🔹 Try Firebase verification first
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        const email = decoded.email;
        const user = await User.findOne({ email });
        if (user) {
          userId = user._id.toString();
          console.log(`✅ Socket registered (Firebase): ${email}`);
        }
      } catch {
        // 🔹 Fallback to legacy JWT
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id || decoded._id || null;
          if (userId)
            console.log(`✅ Socket registered (JWT): ${userId}`);
        } catch {
          console.log("⚠️ Invalid token during socket registration");
        }
      }

      if (userId) onlineUsers.set(String(userId), socket.id);
    } catch (err) {
      console.error("❌ register socket error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(userId);
        console.log(`🔴 User ${userId} disconnected`);
      }
    }
  });
});

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
