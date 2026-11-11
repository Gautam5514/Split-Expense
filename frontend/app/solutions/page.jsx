import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { SEO_PAGES } from "@/lib/seoPages";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export const metadata = {
  title: { absolute: "Bill Splitting Solutions: Friends, Trips, Roommates | SplitEase" },
  description:
    "Every way to split a bill with SplitEase: friends, restaurants, trips, roommates, rent, couples and more. Free split bill calculator and group expense tracker.",
  keywords: ["split bill app", "bill splitter", "split expenses", "expense splitter", "group expense tracker"],
  alternates: { canonical: `${siteUrl}/solutions` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/solutions`,
    title: "Bill splitting solutions | SplitEase",
    description: "Split bills with friends, roommates and travel groups. Free.",
    siteName: "SplitEase",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "SplitEase" }],
  },
};

export default function SolutionsIndex() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SplitEase bill splitting solutions",
    url: `${siteUrl}/solutions`,
    hasPart: SEO_PAGES.map((p) => ({ "@type": "WebPage", name: p.metaTitle, url: `${siteUrl}/solutions/${p.slug}` })),
  };
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
        <h1 className="font-serif-premium text-4xl leading-tight sm:text-6xl">Split any bill, any way, with anyone</h1>
        <p className="mt-5 max-w-2xl text-lg text-white/60">
          Pick what you are splitting. Each guide explains the fairest method and shows how SplitEase tracks it.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SEO_PAGES.map((p) => (
            <Link key={p.slug} href={`/solutions/${p.slug}`} className="group rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 transition hover:bg-white/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">{p.eyebrow}</div>
              <div className="mt-2 text-lg font-bold">{p.h1}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 group-hover:text-white">
                Read more <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
