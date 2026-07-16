import Link from "next/link";
import Footer from "@/components/Footer";
import BlogCover from "@/components/blog/BlogCover";
import { BLOG_POSTS } from "@/lib/blogPosts";

// Server-rendered for SEO: the full post list ships as HTML, no JS required.

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
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS;

  const structuredData = {
    "@context": "https://schema.org",
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
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.date,
      author: { "@type": "Organization", name: "SplitEase" },
    })),
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

      {/* ── Featured post ── */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 -mt-24 sm:-mt-32">
        <Link
          href={`/blog/${featured.slug}`}
          className="group block overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_30px_80px_-40px_rgba(8,145,178,0.4)]"
        >
          <BlogCover post={featured} />
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 text-cyan-400">
                Featured
              </span>
              <span className="text-white/40">{featured.category}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40">{formatDate(featured.date)}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40">{featured.readTime}</span>
            </div>
            <h2 className="font-serif-premium mt-5 text-2xl sm:text-4xl leading-tight text-white group-hover:text-cyan-100 transition-colors">
              {featured.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-white/55">
              {featured.description}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white group-hover:gap-3.5 transition-all">
              Read the guide <span aria-hidden>→</span>
            </span>
          </div>
        </Link>
      </section>

      {/* ── Post grid ── */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-[0_25px_60px_-35px_rgba(8,145,178,0.45)]"
            >
              <BlogCover post={post} compact />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-white/60">
                    {post.category}
                  </span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="font-serif-premium mt-4 text-xl leading-snug text-white group-hover:text-cyan-100 transition-colors">
                  {post.title}
                </h3>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-white/50">
                  {post.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                  <span className="text-[11px] font-semibold text-white/35">{formatDate(post.date)}</span>
                  <span className="text-[12px] font-bold text-white/60 group-hover:text-cyan-400 transition-colors">
                    Read →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 text-center">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d0d0d] to-black p-9 sm:p-14">
          <h2 className="font-serif-premium text-2xl sm:text-4xl text-white mb-4">
            Stop reading about it. Split your first bill.
          </h2>
          <p className="text-white/55 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Free forever — unlimited groups, live balances, receipt scanning
            and one-tap settlements.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 rounded-full font-bold text-black bg-white hover:bg-white/95 transition-all hover:scale-105 active:scale-95 text-sm sm:text-base shadow-[0_4px_25px_rgba(255,255,255,0.18)]"
          >
            Get Started For Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
