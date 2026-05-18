import express from "express";
import { getBalances } from "../controllers/balanceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:groupId", authMiddleware, getBalances);

export default router;
