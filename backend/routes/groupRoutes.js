import express from "express";
import {
  createGroup,
  getGroups,
  getGroupById,
  addMembersByEmail,
  removeMember,
  listAvailableUsers,
  markGroupCompleted
} from "../controllers/groupController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getGroups);
router.get("/:groupId", authMiddleware, getGroupById);

// list users not in the group (for multi-select UI)
router.get("/:groupId/available-users", authMiddleware, listAvailableUsers);

// add & remove members
router.post("/:groupId/members", authMiddleware, addMembersByEmail); // body { emails: [] }
router.delete("/:groupId/members/:userId", authMiddleware, removeMember);
router.put("/:groupId/complete", authMiddleware, markGroupCompleted);

export default router;
