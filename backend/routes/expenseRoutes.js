import express from "express";
import {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  requestSettlement,
  confirmSettlementRequest,
  rejectSettlementRequest,
  cancelSettlementRequest,
  getPendingSettlements,
} from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addExpense);

// Two-party settlement flow: requesting never touches balances by itself,
// only the counterparty's confirm does. Order matters - "/settle/pending/:groupId"
// must be declared before "/settle/:requestId/*" so Express doesn't treat
// "pending" as a requestId.
router.post("/settle/request", authMiddleware, requestSettlement);
router.get("/settle/pending/:groupId", authMiddleware, getPendingSettlements);
router.post("/settle/:requestId/confirm", authMiddleware, confirmSettlementRequest);
router.post("/settle/:requestId/reject", authMiddleware, rejectSettlementRequest);
router.post("/settle/:requestId/cancel", authMiddleware, cancelSettlementRequest);

router.get("/:groupId", authMiddleware, getExpenses);

// The payer can relabel (description / category / notes) or remove their own bill.
router.patch("/:expenseId", authMiddleware, updateExpense);
router.delete("/:expenseId", authMiddleware, deleteExpense);

export default router;
