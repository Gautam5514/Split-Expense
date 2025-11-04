import express from "express";
import { addExpense, getExpenses } from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addExpense);
router.get("/:groupId", authMiddleware, getExpenses);

export default router;
