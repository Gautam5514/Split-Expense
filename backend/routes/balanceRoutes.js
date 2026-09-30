import express from "express";
import { getBalances, getMyBalanceSummary } from "../controllers/balanceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Must come before /:groupId so "summary" isn't read as a group id.
router.get("/summary", authMiddleware, getMyBalanceSummary);
router.get("/:groupId", authMiddleware, getBalances);

export default router;
