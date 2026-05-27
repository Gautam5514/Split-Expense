import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, uploadProfileImage, deleteAccount } from "../controllers/userProfileController.js";

const router = express.Router();
router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.post("/image", authMiddleware, uploadProfileImage);
router.delete("/account", authMiddleware, deleteAccount);

export default router;
