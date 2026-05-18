import express from "express";
import {
  createNotepad,
  getGroupNotepads,
  addStep,
  reorderSteps,
} from "../controllers/notepadController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createNotepad); 
router.get("/:groupId", authMiddleware, getGroupNotepads); 
router.post("/:notepadId/steps", authMiddleware, addStep); 
router.put("/:notepadId/reorder", authMiddleware, reorderSteps); 

export default router;
