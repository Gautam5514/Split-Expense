import express from "express";
import rateLimit from "express-rate-limit";
import { submitContactMessage } from "../controllers/contactController.js";

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent. Please try again in 15 minutes." },
});

router.post("/", contactLimiter, submitContactMessage);

export default router;
