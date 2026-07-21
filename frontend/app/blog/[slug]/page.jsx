import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import BlogCover from "@/components/blog/BlogCover";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { getAllPosts, getMergedPostBySlug } from "@/lib/blogPostsServer";

// Static posts are pre-rendered at build time (SEO-critical, hand-written
// content). Admin-authored DB posts render on-demand instead - dynamicParams
// stays true so a slug that isn't in the static list still resolves.

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getMergedPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `${siteUrl}/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `${siteUrl}/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      siteName: "SplitEase",
      publishedTime: post.date,
      images: [{ url: post.cover.image, width: 1672, height: 941, alt: post.cover.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.cover.image],
    },
  };
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getMergedPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();
  const related = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${siteUrl}/blog/${post.slug}#article`,
        mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
        headline: post.title,
        description: post.description,
        keywords: post.keywords.join(", "),
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: "SplitEase", url: siteUrl },
        publisher: {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: "SplitEase",
          logo: { "@type": "ImageObject", url: `${siteUrl}/logo-icon.png` },
        },
        image: `${siteUrl}${post.cover.image}`,
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/blog/${post.slug}#faq`,
        mainEntity: post.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/blog/${post.slug}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
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

      {/* ── Article hero: landing page treatment, both stones ── */}
      <header className="relative w-full overflow-hidden flex flex-col items-center bg-black pt-28 sm:pt-36 pb-32 sm:pb-44">
        <div
          className="absolute inset-x-0 top-0 bottom-0 z-0"
          style={{ background: "linear-gradient(180deg, #000 0%, #2F2C2A 67%)" }}
        />
        <div
          className="pointer-events-none absolute top-[45%] bottom-0 -left-[218px] -right-[218px] z-[4]"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 83.35%)" }}
        />

        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center text-center">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <span aria-hidden>/</span>
            <span className="text-cyan-400">{post.category}</span>
          </nav>
          <h1 className="font-serif-premium font-normal text-white text-3xl sm:text-5xl md:text-[3.4rem] tracking-tight leading-[1.1] mb-6">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold text-white/45">
            <span>By the SplitEase Team</span>
            <span aria-hidden>·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden>·</span>
            <span>{post.readTime}</span>
          </div>
        </div>

        <picture>
          <source srcSet="/stone-left.webp" type="image/webp" />
          <img
            src="/stone-left.webp"
            alt=""
            decoding="async"
            className="pointer-events-none absolute max-w-none bottom-[-260px] left-[-180px] size-[560px] max-lg:bottom-[-160px] max-lg:left-[-140px] max-lg:size-[400px] max-md:bottom-[-70px] max-md:left-[-16%] max-md:size-[230px] z-[5] opacity-90"
          />
        </picture>
        <picture>
          <source srcSet="/stone-right.webp" type="image/webp" />
          <img
            src="/stone-right.webp"
            alt=""
            decoding="async"
            className="pointer-events-none absolute max-w-none right-[-620px] bottom-[-300px] h-[660px] w-[1050px] max-lg:right-[-430px] max-lg:bottom-[-190px] max-lg:h-[480px] max-lg:w-[760px] max-md:right-[-170px] max-md:bottom-[-70px] max-md:size-[330px] z-[5] opacity-90"
          />
        </picture>
      </header>

      {/* ── Article body ── */}
      <article className="relative z-10 w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-6 -mt-14 sm:-mt-20 pb-6">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A]">
          {/* Original editorial cover art, unique to this guide. */}
          <BlogCover post={post} />

          <div className="px-5 py-8 sm:px-11 sm:py-11 lg:px-16 lg:py-13">
          {post.intro.map((para, i) => (
            <p
              key={i}
              className={`leading-relaxed text-white/70 mb-5 ${i === 0 ? "text-base sm:text-lg lg:text-[19px] text-white/80" : "text-[15px] sm:text-base"}`}
            >
              {para}
            </p>
          ))}

          {post.sections.map((section) => (
            <section key={section.h2} className="mt-10">
              <h2 className="font-serif-premium text-2xl sm:text-[1.7rem] text-white leading-snug mb-4">
                {section.h2}
              </h2>
              {section.p?.map((para, i) => (
                <p key={i} className="text-[15px] sm:text-base leading-relaxed text-white/60 mb-4">
                  {para}
                </p>
              ))}
              {section.list && (
                <ul className="space-y-3 my-5">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] sm:text-base leading-relaxed text-white/60">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* FAQ (matches the FAQPage schema above) */}
          <section className="mt-12 border-t border-white/[0.08] pt-9">
            <h2 className="font-serif-premium text-2xl text-white mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {post.faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-[15px] font-bold text-white mb-2">{faq.q}</h3>
                  <p className="text-[14px] leading-relaxed text-white/55">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Inline CTA */}
          <div className="mt-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-7 text-center">
            <h2 className="font-serif-premium text-xl sm:text-2xl text-white mb-2.5">
              Put this into practice in 2 minutes
            </h2>
            <p className="text-white/55 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Create a free SplitEase group, invite your people, and let the app
              handle the math from the very first expense.
            </p>
            <Link
              href="/register"
              className="inline-block px-7 py-3 rounded-full font-bold text-black bg-white hover:bg-white/95 transition-all hover:scale-105 active:scale-95 text-sm shadow-[0_4px_25px_rgba(255,255,255,0.15)]"
            >
              Start splitting free
            </Link>
          </div>
          </div>
        </div>
      </article>

      {/* ── Related posts ── */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h2 className="font-serif-premium text-2xl sm:text-3xl text-white mb-7 text-center">
          Keep reading
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {related.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30"
            >
              <BlogCover post={p} compact />
              <div className="p-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {p.category} · {p.readTime}
                </span>
                <h3 className="font-serif-premium mt-2.5 text-[17px] leading-snug text-white group-hover:text-cyan-100 transition-colors">
                  {p.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href="/blog" className="text-sm font-bold text-white/60 hover:text-cyan-400 transition-colors">
            ← All articles
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
