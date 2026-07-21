import slugify from "../utils/slugify.js";
import BlogPost from "../models/blogPostModel.js";
import { isValidObjectId } from "../middleware/validate.js";

// -------------------- PUBLIC --------------------
// Merged client-side with the hand-written posts in lib/blogPosts.js.
export const listPublicPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true }).sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- ADMIN --------------------
export const listAllPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buildPostFields = (body) => ({
  category: body.category?.trim(),
  title: body.title?.trim(),
  description: body.description?.trim(),
  readTime: body.readTime?.trim() || "5 min read",
  cover: {
    image: body.cover?.image?.trim() || "",
    alt: body.cover?.alt?.trim() || "",
    c1: body.cover?.c1 || "#0891B2",
    c2: body.cover?.c2 || "#0EA5E9",
  },
  intro: Array.isArray(body.intro) ? body.intro.filter(Boolean) : [],
  sections: Array.isArray(body.sections)
    ? body.sections
        .filter((s) => s.h2?.trim())
        .map((s) => ({
          h2: s.h2.trim(),
          p: Array.isArray(s.p) ? s.p.filter(Boolean) : [],
          list: Array.isArray(s.list) ? s.list.filter(Boolean) : [],
        }))
    : [],
  faqs: Array.isArray(body.faqs)
    ? body.faqs.filter((f) => f.q?.trim() && f.a?.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
    : [],
  published: body.published !== false,
});

export const createPost = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ field: "title", message: "Title is required." });
    if (!req.body.category?.trim())
      return res.status(400).json({ field: "category", message: "Category is required." });
    if (!req.body.description?.trim())
      return res.status(400).json({ field: "description", message: "Description is required." });

    const baseSlug = slugify(title.trim());
    let slug = baseSlug;
    let suffix = 1;
    while (await BlogPost.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const post = await BlogPost.create({ ...buildPostFields(req.body), title: title.trim(), slug });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const fields = buildPostFields(req.body);
    if (req.body.title?.trim()) fields.title = req.body.title.trim();
    fields.updatedAt = new Date();

    const updated = await BlogPost.findByIdAndUpdate(id, fields, { new: true });
    if (!updated) return res.status(404).json({ message: "Post not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await BlogPost.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Post not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
