import mongoose from "mongoose";

// Mirrors the shape of the hand-written posts in frontend/lib/blogPosts.js so
// admin-authored posts render through the exact same blog components.
const blogPostSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  category: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  readTime: { type: String, default: "5 min read" },
  cover: {
    image: { type: String, default: "" },
    alt: { type: String, default: "" },
    c1: { type: String, default: "#0891B2" },
    c2: { type: String, default: "#0EA5E9" },
  },
  intro: [{ type: String }],
  sections: [
    {
      h2: { type: String, required: true },
      p: [{ type: String }],
      list: [{ type: String }],
    },
  ],
  faqs: [
    {
      q: { type: String, required: true },
      a: { type: String, required: true },
    },
  ],
  published: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("BlogPost", blogPostSchema);
