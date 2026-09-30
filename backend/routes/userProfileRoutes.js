import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, uploadProfileImage, uploadUpiQr, removeUpiQr, deleteAccount } from "../controllers/userProfileController.js";

const router = express.Router();
router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.post("/image", authMiddleware, uploadProfileImage);
router.post("/upi-qr", authMiddleware, uploadUpiQr);
router.delete("/upi-qr", authMiddleware, removeUpiQr);
router.delete("/account", authMiddleware, deleteAccount);

export default router;
