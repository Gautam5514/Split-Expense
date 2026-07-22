import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import Footer from "@/components/Footer";

/* Shared shell for every legal document (Legal Overview, Privacy, Terms,
   Security, Cookies) so they read as one classical, quiet policy page -
   dark landing-page palette, serif title, numbered clauses - instead of
   five separately designed pages. Each page stands on its own (no shared
   sidebar), so a short "related policies" strip at the end is how readers
   move between documents. */

const LEGAL_PAGES = [
  { label: "Legal Overview", href: "/legal" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Security Center", href: "/security" },
  { label: "Cookie Settings", href: "/cookies" },
];

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function InfoPageLayout({
  eyebrow,
  title,
  description,
  effectiveDate,
  sections,
  contactNote,
  currentHref,
}) {
  return (
    <div className="min-h-[100dvh] bg-[#030303] text-white">
      {/* Header - quiet, no hero imagery or motion, just title + intro */}
      <header className="relative px-6 pb-14 pt-36 sm:pt-44">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.07)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
            <span className="h-px w-6 bg-cyan-400/50" />
            {eyebrow}
          </p>
          <h1 className="font-serif-premium text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
            {title}
          </h1>
          {effectiveDate && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Effective {effectiveDate}
            </p>
          )}
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            {description}
          </p>
        </div>
      </header>

      {/* Body - classical numbered clauses, single reading column */}
      <main className="mx-auto max-w-2xl px-6 pb-20">
        <div className="border-t border-white/[0.08]">
          {sections.map((section, index) => (
            <section
              key={section.title}
              id={slugify(section.title)}
              className="scroll-mt-24 border-b border-white/[0.08] py-8"
            >
              <h2 className="flex items-baseline gap-3 text-lg font-bold tracking-tight text-white sm:text-xl">
                <span className="font-mono text-sm font-semibold text-cyan-400">
                  {index + 1}.
                </span>
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 pl-7 text-sm leading-relaxed text-white/55 sm:pl-8 sm:text-[15px]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {contactNote && (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-white/55">{contactNote}</p>
            <a
              href="mailto:support@splitease.app"
              className="clickable inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
            >
              <Mail size={15} />
              Contact support
            </a>
          </div>
        )}

        {/* Related policies - since pages don't share a sidebar, this is
            how a reader moves from one legal doc to the next. */}
        <div className="mt-14 border-t border-white/[0.08] pt-8">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Related policies
          </p>
          <nav className="flex flex-wrap gap-2.5">
            {LEGAL_PAGES.filter((page) => page.href !== currentHref).map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="clickable inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-white/60 transition-all duration-200 hover:border-cyan-400/30 hover:text-white"
              >
                {page.label}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
