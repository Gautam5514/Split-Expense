import Footer from "@/components/Footer";
import BlogPageContent from "@/components/blog/BlogPageContent";
import { BLOG_POSTS } from "@/lib/blogPosts";

// Server-rendered for SEO: the full post list ships as HTML, no JS required.
// The category filter is a client-side progressive enhancement on top.

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";

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
    images: [{ url: "/logo-icon.png", width: 512, height: 512, alt: "SplitEase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The SplitEase Blog — Master Shared Expenses",
    description:
      "Guides on splitting expenses with friends, roommates and travel groups, from the team building SplitEase.",
  },
};

export default function BlogPage() {
  // Only card-level fields cross the server→client boundary; shipping full
  // article bodies (sections, faqs) in the hydration payload would bloat the page.
  const [featured, ...rest] = BLOG_POSTS.map(
    ({ slug, category, title, description, date, readTime, cover }) => ({
      slug, category, title, description, date, readTime, cover,
    })
  );

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
        blogPost: BLOG_POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          description: p.description,
          url: `${siteUrl}/blog/${p.slug}`,
          datePublished: p.date,
          author: { "@type": "Organization", name: "SplitEase" },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/blog#postlist`,
        itemListElement: BLOG_POSTS.map((p, i) => ({
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
      <section className="relative w-full overflow-hidden flex flex-col items-center bg-black pt-28 sm:pt-36 pb-40 sm:pb-56">
        {/* Background gradients matching the landing hero */}
        <div
          className="absolute inset-x-0 top-0 bottom-0 z-0"
          style={{ background: "linear-gradient(180deg, #000 0%, #2F2C2A 67%)" }}
        />
        <div
          className="pointer-events-none absolute top-[45%] bottom-0 -left-[218px] -right-[218px] z-[4]"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 83.35%)" }}
        />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center text-center">
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
        </div>

        {/* Flanking rock textures — the same stones as the landing hero */}
        <picture>
          <source srcSet="/stone-left.webp" type="image/webp" />
          <img
            src="/stone-left.webp"
            alt=""
            decoding="async"
            className="pointer-events-none absolute max-w-none bottom-[-220px] left-[-160px] size-[620px] max-lg:bottom-[-140px] max-lg:left-[-120px] max-lg:size-[440px] max-md:bottom-[-60px] max-md:left-[-12%] max-md:size-[280px] z-[5]"
          />
        </picture>
        <picture>
          <source srcSet="/stone-right.webp" type="image/webp" />
          <img
            src="/stone-right.webp"
            alt=""
            decoding="async"
            className="pointer-events-none absolute max-w-none right-[-640px] bottom-[-260px] h-[720px] w-[1150px] max-lg:right-[-460px] max-lg:bottom-[-170px] max-lg:h-[520px] max-lg:w-[830px] max-md:right-[-180px] max-md:bottom-[-60px] max-md:size-[380px] z-[5]"
          />
        </picture>
      </section>

      {/* ── Everything below the hero, in the landing page's design language ── */}
      <BlogPageContent featured={featured} posts={rest} />

      <Footer />
    </div>
  );
}
