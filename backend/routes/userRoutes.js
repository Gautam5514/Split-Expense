import express from "express";
import rateLimit from "express-rate-limit";
import { listUsers, getMe, getUserById } from "../controllers/userController.js";
import { getUserAnalytics } from "../controllers/userAnalyticsController.js";
import {
  getContacts,
  lookupByEmail,
  getPrivacy,
  updatePrivacy,
  blockUser,
  unblockUser,
} from "../controllers/peopleController.js";
import { globalSearch } from "../controllers/globalSearchController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { isValidEmail } from "../middleware/validate.js";

const router = express.Router();

// Exact-email lookups and user search are the only ways to reach people you
// don't know yet, so cap them per user to stop email guessing at scale.
const lookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id}`,
  message: { message: "Too many lookups. Please try again in a while." },
});
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id}`,
  message: { message: "Too many searches. Please slow down." },
});

router.get("/analytics", authMiddleware, getUserAnalytics);

// Search: known contacts by name/email; strangers only by exact email (masked)
// An exact-email query on "/" is a lookup too - same budget as /lookup.
const lookupIfEmail = (req, res, next) =>
  isValidEmail(req.query.q) ? lookupLimiter(req, res, next) : next();
router.get("/", authMiddleware, searchLimiter, lookupIfEmail, listUsers);
router.get("/contacts", authMiddleware, searchLimiter, getContacts);
router.get("/lookup", authMiddleware, lookupLimiter, lookupByEmail);

// Unified global search (groups + people + expenses). Same per-user search
// budget as the other search endpoints. Declared before "/:id" so "search"
// is never read as a user id.
router.get("/search/global", authMiddleware, searchLimiter, globalSearch);

// Current user profile (from JWT)
router.get("/me", authMiddleware, getMe);
router.get("/me/privacy", authMiddleware, getPrivacy);
router.patch("/me/privacy", authMiddleware, updatePrivacy);

router.post("/:id/block", authMiddleware, blockUser);
router.delete("/:id/block", authMiddleware, unblockUser);

// Single user by ID
router.get("/:id", authMiddleware, getUserById);

export default router;
