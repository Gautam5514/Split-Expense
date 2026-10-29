import PageHeroShell from "@/components/PageHeroShell";
import Footer from "@/components/Footer";
import BlogPageContent from "@/components/blog/BlogPageContent";
import { getAllPosts } from "@/lib/blogPostsServer";

// Server-rendered for SEO: the full post list ships as HTML, no JS required.
// The category filter is a client-side progressive enhancement on top.

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export const metadata = {
  title: "Blog — Expense Splitting Tips, Guides & Product News",
  description:
    "Practical guides on splitting expenses with friends, roommates and travel groups — plus settlement math, app comparisons and SplitEase product news.",
  keywords: [
    "expense splitting blog", "split bills guide", "group expense tips",
    "roommate expenses", "trip expense management", "splitwise alternative",
  ],
  alternates: { canonical: `${siteUrl}/blog` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/blog`,
    title: "The SplitEase Blog — Master Shared Expenses",
    description:
      "Guides on splitting expenses with friends, roommates and travel groups, from the team building SplitEase.",
    siteName: "SplitEase",
    images: [{ url: "/logo-concept-app.svg", width: 512, height: 512, alt: "SplitEase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The SplitEase Blog — Master Shared Expenses",
    description:
      "Guides on splitting expenses with friends, roommates and travel groups, from the team building SplitEase.",
  },
};

export default async function BlogPage() {
  const allPosts = await getAllPosts();

  // Only card-level fields cross the server→client boundary; shipping full
  // article bodies (sections, faqs) in the hydration payload would bloat the page.
  // Ensure the Founder Story post stays at the head (featured post)
  const mappedPosts = allPosts.map(
    ({ slug, category, title, description, date, readTime, cover, author }) => ({
      slug, category, title, description, date, readTime, cover, author,
    })
  );

  const featuredIndex = mappedPosts.findIndex(
    (p) => p.slug === "gautam-pandit-founder-splitease-story" || p.category === "Founder Story"
  );

  let featured;
  let rest;

  if (featuredIndex !== -1) {
    featured = mappedPosts[featuredIndex];
    rest = mappedPosts.filter((_, idx) => idx !== featuredIndex);
  } else {
    [featured, ...rest] = mappedPosts;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${siteUrl}/blog#blog`,
        url: `${siteUrl}/blog`,
        name: "The SplitEase Blog",
        description:
          "Guides and ideas on splitting expenses with friends, roommates and travel groups.",
        publisher: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "SplitEase" },
        blogPost: allPosts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          description: p.description,
          url: `${siteUrl}/blog/${p.slug}`,
          datePublished: p.date,
          author: p.author ? { "@type": "Person", name: p.author } : { "@type": "Organization", name: "SplitEase" },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/blog#postlist`,
        itemListElement: allPosts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${siteUrl}/blog/${p.slug}`,
          name: p.title,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/blog#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* ── Hero: same treatment as the landing page ── */}
      <PageHeroShell className="pb-40 pt-28 sm:pb-56 sm:pt-36">
          <p className="mb-5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white/70">
            The SplitEase Blog
          </p>
          <h1 className="font-serif-premium font-normal text-white text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05] mb-6">
            Master the art of shared expenses
          </h1>
          <p className="text-white/60 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed font-medium">
            Guides, settlement math and honest app comparisons — everything you
            need to split bills with friends, roommates and travel groups
            without the awkwardness.
          </p>
      </PageHeroShell>

      {/* ── Everything below the hero, in the landing page's design language ── */}
      <BlogPageContent featured={featured} posts={rest} />

      <Footer />
    </div>
  );
}
