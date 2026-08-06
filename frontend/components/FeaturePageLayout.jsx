import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Footer from "@/components/Footer";

/* Shared shell for every standalone feature page (AI Expense Splitter,
   Smart Settlements, OCR Receipt Scan, Group Chat Hub, QR & Link Invites,
   Secure OTP Login). Same dark landing-page theme as the rest of the
   marketing site: hero + real product render, a use-case narrative, a
   capability checklist, a "how it works" walkthrough, and cross-links to
   the other features so visitors can browse the whole set. */

const FEATURE_PAGES = [
  { label: "AI Expense Splitter", href: "/features/ai-expense-splitter" },
  { label: "Smart Settlements", href: "/features/smart-settlements" },
  { label: "OCR Receipt Scan", href: "/features/ocr-receipt-scan" },
  { label: "Group Chat Hub", href: "/features/group-chat-hub" },
  { label: "QR & Link Invites", href: "/features/qr-invites" },
  { label: "Secure OTP Login", href: "/features/secure-login" },
];

// Every feature page must say plainly whether what it describes is live,
// in beta, or still being built - never let marketing copy alone imply a
// feature is available when it isn't.
const STATUS_STYLES = {
  Available: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Beta: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "Coming soon": "border-white/15 bg-white/5 text-white/50",
};

export default function FeaturePageLayout({
  tag,
  tagColor = "text-cyan-400",
  glowBg = "bg-cyan-500/10",
  borderHover = "hover:border-cyan-500/25",
  status = "Available",
  title,
  description,
  image,
  imageAlt,
  useCase,
  points = [],
  steps = [],
  currentHref,
}) {
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      {/* Hero */}
      <header className="relative px-6 pb-20 pt-36 sm:pt-44">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.07)_0%,transparent_70%)]" />

        <div className="relative mx-auto max-w-6xl">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs font-semibold text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest font-mono ${tagColor}`}>
                  {tag}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[status] || STATUS_STYLES.Available}`}>
                  {status}
                </span>
              </div>
              <h1 className="font-serif-premium mt-4 text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
                {description}
              </p>

              <ul className="mt-8 space-y-3">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm font-medium text-white/70">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <Check className="h-3 w-3 text-white/60" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="clickable mt-9 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
              >
                Get started for free
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Real feature render, same treatment as the homepage timeline */}
            <div
              className={`group relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#050506] shadow-2xl transition-colors duration-500 ${borderHover}`}
            >
              <div className={`pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full ${glowBg} blur-3xl transition-transform duration-700 group-hover:scale-110`} />
              <img
                src={image}
                alt={imageAlt}
                className="relative z-10 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.03]" />
            </div>
          </div>
        </div>
      </header>

      {/* Use case narrative */}
      {useCase && (
        <section className="mx-auto max-w-3xl px-6 pb-20">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <span className="h-px w-6 bg-white/20" />
            Where this fits in
          </p>
          <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
            {useCase.heading}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/55 sm:text-[15px]">
            {useCase.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      {steps.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <span className="h-px w-6 bg-white/20" />
            How it works
          </p>
          <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
            Three steps, no learning curve
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 transition-colors duration-300 hover:border-white/[0.16]"
              >
                <span className={`font-serif-premium text-3xl font-normal ${tagColor}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="border-t border-white/[0.08] pt-8">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Explore more features
          </p>
          <nav className="flex flex-wrap gap-2.5">
            {FEATURE_PAGES.filter((page) => page.href !== currentHref).map((page) => (
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
      </section>

      <Footer />
    </div>
  );
}
