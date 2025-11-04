import express from "express";
import { listUsers, getMe, getUserById } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// List/search users (for your “add to group” multiselect)
router.get("/", authMiddleware, listUsers);

// Current user profile (from JWT)
router.get("/me", authMiddleware, getMe);

// Single user by ID
router.get("/:id", authMiddleware, getUserById);

export default router;
