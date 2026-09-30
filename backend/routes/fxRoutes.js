import express from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getRate } from "../utils/fxRates.js";

const router = express.Router();

const fxLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id}`,
  message: { message: "Too many rate lookups. Please try again shortly." },
});

// GET /api/fx?from=USD&to=INR -> { from, to, rate, source, fetchedAt }
router.get("/", authMiddleware, fxLimiter, async (req, res) => {
  const from = String(req.query.from || "").toUpperCase();
  const to = String(req.query.to || "INR").toUpperCase();
  try {
    const { rate, source, fetchedAt } = await getRate(from, to);
    res.json({ from, to, rate, source, fetchedAt });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

export default router;
