import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMyReferralData } from "../controllers/referralController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyReferralData);

export default router;
