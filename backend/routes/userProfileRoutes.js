import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userProfileController.js";
import { uploadProfileImage } from "../controllers/userProfileController.js";

const router = express.Router();
router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
// 🆕 upload profile image
router.post("/image", authMiddleware, uploadProfileImage);

export default router;
