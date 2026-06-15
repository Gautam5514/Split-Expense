import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMyReferralData, purchaseStoreItem } from "../controllers/referralController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyReferralData);
router.post("/purchase", authMiddleware, purchaseStoreItem);

export default router;
