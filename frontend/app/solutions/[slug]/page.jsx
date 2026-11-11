import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import Footer from "@/components/Footer";
import BillCalculator from "@/components/seo/BillCalculator";
import { SEO_PAGES, SEO_LAST_UPDATED, getSeoPage } from "@/lib/seoPages";
import { BLOG_POSTS } from "@/lib/blogPosts";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  const url = `${siteUrl}/solutions/${page.slug}`;
  return {
    title: { absolute: page.metaTitle },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: page.metaTitle,
      description: page.description,
      siteName: "SplitEase",
      images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "SplitEase" }],
    },
    twitter: { card: "summary", title: page.metaTitle, description: page.description, images: ["/logo.png"] },
  };
}

export default async function SolutionPage({ params }) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const url = `${siteUrl}/solutions/${page.slug}`;
  const posts = (page.blog || []).map((s) => BLOG_POSTS.find((b) => b.slug === s)).filter(Boolean);
  const related = (page.related || []).map(getSeoPage).filter(Boolean);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: page.metaTitle,
        description: page.description,
        dateModified: SEO_LAST_UPDATED,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#app` },
      },
      {
        "@type": "SoftwareApplication",
        name: "SplitEase",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android",
        url: siteUrl,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "HowTo",
        name: page.h1,
        step: page.steps.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Solutions", item: `${siteUrl}/solutions` },
          { "@type": "ListItem", position: 3, name: page.eyebrow, item: url },
        ],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header className="relative px-4 pb-14 pt-28 text-center sm:px-6 sm:pt-36">
        <div className="absolute inset-0 -z-0" style={{ background: "linear-gradient(180deg,#000 0%,#1a1816 100%)" }} />
        <div className="relative mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <Link href="/solutions" className="hover:text-white">Solutions</Link>
            <span aria-hidden>/</span>
            <span className="text-white/70">{page.eyebrow}</span>
          </nav>
          <h1 className="font-serif-premium text-4xl font-normal leading-[1.1] tracking-tight sm:text-6xl">{page.h1}</h1>
          <div className="mt-6 space-y-3 text-base leading-relaxed text-white/65 sm:text-lg">
            {page.intro.map((t, i) => <p key={i}>{t}</p>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-white/90">
              Start splitting free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/downloadapp" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5">
              Get the app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-16 px-4 pb-20 sm:px-6">
        <BillCalculator />

        <section aria-labelledby="why">
          <h2 id="why" className="font-serif-premium text-3xl sm:text-4xl">Why people use SplitEase</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {page.benefits.map((b) => (
              <div key={b.t} className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-white/60" />{b.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="font-serif-premium text-3xl sm:text-4xl">How it works</h2>
          <ol className="mt-6 space-y-3">
            {page.steps.map(([title, text], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold">{i + 1}</span>
                <div>
                  <div className="font-bold">{title}</div>
                  <p className="mt-1 text-sm text-white/60">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq">
          <h2 id="faq" className="font-serif-premium text-3xl sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0A0A0A]">
            {page.faqs.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {(posts.length > 0 || related.length > 0) && (
          <section aria-labelledby="more">
            <h2 id="more" className="font-serif-premium text-3xl sm:text-4xl">Keep reading</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5 text-sm font-semibold transition hover:bg-white/[0.04]">
                  {p.title}
                </Link>
              ))}
              {related.map((r) => (
                <Link key={r.slug} href={`/solutions/${r.slug}`} className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5 text-sm font-semibold transition hover:bg-white/[0.04]">
                  {r.eyebrow}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h2 className="font-serif-premium text-3xl">Stop chasing money. Start splitting.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/60">Create a group, add a bill and see who owes whom in under a minute.</p>
          <Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black">
            Create a free group <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
