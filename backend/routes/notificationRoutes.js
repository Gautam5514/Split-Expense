import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  registerPushToken,
  unregisterPushToken,
  registerWebPushToken,
  unregisterWebPushToken,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserNotifications);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);
router.post("/web-push-token", authMiddleware, registerWebPushToken);
router.delete("/web-push-token", authMiddleware, unregisterWebPushToken);




router.put("/mark-read", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
