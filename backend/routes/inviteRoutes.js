import express from "express";
import { getMyInvites, acceptInvite, declineInvite } from "../controllers/inviteController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getMyInvites);
router.post("/:inviteId/accept", authMiddleware, acceptInvite);
router.post("/:inviteId/decline", authMiddleware, declineInvite);

export default router;
