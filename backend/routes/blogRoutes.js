import express from "express";
import { listPublicPosts, getPublicPostBySlug } from "../controllers/blogController.js";

const router = express.Router();

// Public read-only endpoints, merged client-side with the static posts.
router.get("/posts", listPublicPosts);
router.get("/posts/:slug", getPublicPostBySlug);

export default router;
