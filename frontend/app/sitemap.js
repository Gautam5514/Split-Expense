import { BLOG_POSTS } from "@/lib/blogPosts";
import { SEO_PAGES, SEO_LAST_UPDATED } from "@/lib/seoPages";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export default function sitemap() {
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/solutions", priority: 0.9, changeFrequency: "weekly" },
    { path: "/about", priority: 0.9, changeFrequency: "weekly" },
    { path: "/what-we-offer", priority: 0.9, changeFrequency: "monthly" },
    { path: "/features/ai-expense-splitter", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features/smart-settlements", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features/ocr-receipt-scan", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features/group-chat-hub", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features/qr-invites", priority: 0.6, changeFrequency: "monthly" },
    { path: "/features/secure-login", priority: 0.6, changeFrequency: "monthly" },
    { path: "/features/autopilot", priority: 0.7, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/platforms", priority: 0.7, changeFrequency: "monthly" },
    { path: "/mcp", priority: 0.7, changeFrequency: "monthly" },
    { path: "/downloadapp", priority: 0.7, changeFrequency: "monthly" },
    { path: "/help-center", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
    { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/security", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
  ];

  // A fixed date: a sitemap that claims everything changed "now" on every
  // request teaches crawlers to ignore lastmod.
  const lastModified = new Date(SEO_LAST_UPDATED);

  const staticEntries = pages.map(({ path, ...page }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    ...page,
  }));

  // Keyword landing pages for bill-splitting searches.
  const solutionEntries = SEO_PAGES.map((p) => ({
    url: `${siteUrl}/solutions/${p.slug}`,
    lastModified,
    priority: 0.85,
    changeFrequency: "monthly",
  }));

  const blogEntries = BLOG_POSTS.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    priority: post.slug === "gautam-pandit-founder-splitease-story" ? 0.95 : 0.7,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...solutionEntries, ...blogEntries];
}
