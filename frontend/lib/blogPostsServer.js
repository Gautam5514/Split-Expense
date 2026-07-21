// Server-only helpers that merge admin-authored DB posts with the
// hand-written static ones in blogPosts.js. Kept separate from that file
// so client components can keep importing static data with zero network cost.
import { API_BASE_URL } from "@/lib/config";
import { BLOG_POSTS, getPostBySlug as getStaticPostBySlug } from "@/lib/blogPosts";

const normalizeDbPost = (p) => ({
  slug: p.slug,
  category: p.category,
  title: p.title,
  description: p.description,
  keywords: [],
  date: (p.date || p.createdAt || new Date().toISOString()).toString().slice(0, 10),
  readTime: p.readTime,
  cover: p.cover,
  intro: p.intro || [],
  sections: p.sections || [],
  faqs: p.faqs || [],
});

// Never let a slow/down backend break the blog - fall back to the static list.
export async function getDbPosts() {
  try {
    const res = await fetch(`${API_BASE_URL}/blog/posts`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(normalizeDbPost);
  } catch {
    return [];
  }
}

export async function getAllPosts() {
  const dbPosts = await getDbPosts();
  return [...dbPosts, ...BLOG_POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getMergedPostBySlug(slug) {
  const staticPost = getStaticPostBySlug(slug);
  if (staticPost) return staticPost;

  try {
    const res = await fetch(`${API_BASE_URL}/blog/posts/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return normalizeDbPost(await res.json());
  } catch {
    return null;
  }
}
