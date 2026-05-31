import express from "express";
import { addExpense, getExpenses, recordSettlement } from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addExpense);
router.post("/settle", authMiddleware, recordSettlement);
router.get("/:groupId", authMiddleware, getExpenses);

export default router;
