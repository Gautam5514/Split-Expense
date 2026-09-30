import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createQuickSplit,
  listQuickSplits,
  getQuickSplit,
  setParticipantPaid,
  deleteQuickSplit,
} from "../controllers/quickSplitController.js";

const router = express.Router();

router.post("/", authMiddleware, createQuickSplit);
router.get("/", authMiddleware, listQuickSplits);
router.get("/:id", authMiddleware, getQuickSplit);
router.patch("/:id/participants/:pid", authMiddleware, setParticipantPaid);
router.delete("/:id", authMiddleware, deleteQuickSplit);

export default router;
