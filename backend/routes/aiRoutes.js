import express from "express";
import { queryAI } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/query", authMiddleware, queryAI);

export default router;
