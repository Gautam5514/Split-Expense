import express from "express";
import { uploadMedia } from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected upload route
router.post("/", authMiddleware, uploadMedia);

export default router;
