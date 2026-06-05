import express from "express";
import rateLimit from "express-rate-limit";
import { queryAI } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 10 AI queries per minute per IP - prevents Gemini API abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests. Please wait a moment before trying again." },
});

router.post("/query", aiLimiter, authMiddleware, queryAI);

export default router;
