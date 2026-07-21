import express from "express";
import rateLimit from "express-rate-limit";
import { listOpenJobs, getOpenJobById, applyToJob } from "../controllers/careerController.js";

const router = express.Router();

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many applications submitted. Please try again in 15 minutes." },
});

router.get("/jobs", listOpenJobs);
router.get("/jobs/:id", getOpenJobById);
router.post("/jobs/:id/apply", applyLimiter, applyToJob);

export default router;
