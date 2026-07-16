import { BLOG_POSTS } from "@/lib/blogPosts";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";

export default function sitemap() {
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/what-we-offer", priority: 0.9, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
    { path: "/downloadapp", priority: 0.7, changeFrequency: "monthly" },
    { path: "/help-center", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];

  const staticEntries = pages.map(({ path, ...page }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    ...page,
  }));

  const blogEntries = BLOG_POSTS.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...blogEntries];
}
