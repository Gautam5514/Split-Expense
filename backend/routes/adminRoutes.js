import express from "express";
import rateLimit from "express-rate-limit";
import { adminLogin } from "../controllers/adminAuthController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { uploadMedia } from "../controllers/uploadController.js";
import { getAdminStats } from "../controllers/adminStatsController.js";
import {
  listContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} from "../controllers/contactController.js";
import {
  listAllPosts,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/blogController.js";
import {
  listAllJobs,
  createJob,
  updateJob,
  deleteJob,
  listApplications,
  updateApplicationStatus,
} from "../controllers/careerController.js";

const router = express.Router();

// 10 attempts per 15 min - there is exactly one admin account, so this can be strict.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

router.post("/login", adminLoginLimiter, adminLogin);

// Everything below requires a valid admin session.
router.use(adminAuthMiddleware);

router.post("/upload", uploadMedia);
router.get("/stats", getAdminStats);

router.get("/contact-messages", listContactMessages);
router.patch("/contact-messages/:id", updateContactMessageStatus);
router.delete("/contact-messages/:id", deleteContactMessage);

router.get("/blog/posts", listAllPosts);
router.post("/blog/posts", createPost);
router.patch("/blog/posts/:id", updatePost);
router.delete("/blog/posts/:id", deletePost);

router.get("/careers/jobs", listAllJobs);
router.post("/careers/jobs", createJob);
router.patch("/careers/jobs/:id", updateJob);
router.delete("/careers/jobs/:id", deleteJob);

router.get("/careers/applications", listApplications);
router.patch("/careers/applications/:id", updateApplicationStatus);

export default router;
