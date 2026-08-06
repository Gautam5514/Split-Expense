"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Minus } from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

/* Pricing page: statement hero, two plan cards, a grouped feature
   comparison table, and an FAQ accordion. Cell values in FEATURE_GROUPS
   are true (included), false (not available), or "soon" (coming soon). */

const PLANS = [
  {
    name: "Splitease",
    price: "Free",
    blurb: "Everything you need to split with friends. Groups, receipt photos, chat, and smart settlements.",
    cta: "Start for free",
    href: "/register",
    featured: true,
  },
  {
    name: "Splitease Pro",
    price: "Coming Soon",
    blurb: "Power features for heavy groups. Reports, exports, multi-currency, and priority scanning.",
    cta: "Get in touch",
    href: "/contact",
    featured: false,
  },
];

const FEATURE_GROUPS = [
  {
    title: "Groups & Splitting",
    blurb: "Run every shared budget from one place.",
    rows: [
      ["Unlimited groups", true, true],
      ["Unlimited members per group", true, true],
      ["Equal, percent, shares & exact splits", true, true],
      ["QR, link & email invites", true, true],
      ["Shared group notepad", true, true],
    ],
  },
  {
    title: "AI & Receipts",
    blurb: "Let the assistant help - scanning is on the way.",
    rows: [
      ["Attach receipt photos to expenses", true, true],
      ["Built-in AI assistant", true, true],
      ["AI-powered receipt scanning & auto-itemization", false, "soon"],
      ["Priority scan queue", false, "soon"],
      ["Bulk receipt import", false, "soon"],
    ],
  },
  {
    title: "Chat & Settling",
    blurb: "Every payment lives in the conversation.",
    rows: [
      ["Real-time group chat", true, true],
      ["Payments recorded in chat", true, true],
      ["Minimum-transfer settlement suggestions", true, true],
      ["Settlement requests with two-party confirmation", true, true],
      ["Direct UPI payment integration", false, "soon"],
      ["Automatic payment reminders", false, "soon"],
    ],
  },
  {
    title: "Insights",
    blurb: "Know where the money went.",
    rows: [
      ["Live balance dashboard", true, true],
      ["Spending charts", true, true],
      ["Monthly spend reports", false, "soon"],
      ["CSV & PDF export", false, "soon"],
      ["Multi-currency groups", false, "soon"],
    ],
  },
];

const FAQS = [
  {
    q: "Is Splitease really free?",
    a: "Yes. Every core feature, including groups, splits, chat, the AI assistant, and settlement tracking, is free. There are no member caps, trial timers, or locked features. AI-powered receipt scanning is on the roadmap.",
  },
  {
    q: "Will I ever have to pay?",
    a: "The core app stays free. Splitease Pro will be an optional paid tier later, adding power features like reports, exports, and multi-currency. Nothing you use today moves behind it.",
  },
  {
    q: "Is there a limit on groups or friends?",
    a: "No. Create as many groups as you need and invite as many friends as you like. There are no per-member charges.",
  },
  {
    q: "Do I need a card to sign up?",
    a: "No. Sign up with your email or Google account and start splitting immediately. We never ask for payment details.",
  },
  {
    q: "Which platforms does Splitease run on?",
    a: "Splitease works in any modern browser on phone, tablet, and desktop, and you can install it as an app from the Download App page.",
  },
];

function FeatureCell({ value }) {
  if (value === true) return <CheckCircle2 size={20} strokeWidth={1.6} className="text-green-500" />;
  if (value === "soon")
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
        Coming soon
      </span>
    );
  return <Minus size={16} className="text-white/20" />;
}

function FaqItem({ faq, open, onToggle }) {
  return (
    <div className="border-b border-white/[0.08]">
      <button
        onClick={onToggle}
        className="clickable flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-white sm:text-base">{faq.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/50">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-[100dvh] bg-[#0E0D0C] text-white">
      <SmoothScroll />

      {/* Hero: headline overlapping the stone, like the landing hero */}
      <header className="relative overflow-hidden px-6 pb-16 pt-44 text-center sm:pb-24 sm:pt-60">
        {/* Stone fades out on every side via mask, so it melts into the background */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center sm:-top-16">
          <img
            src="/stone-right.webp"
            alt=""
            className="h-[420px] w-auto object-contain opacity-80 sm:h-[640px]"
            style={{
              maskImage: "radial-gradient(ellipse 62% 56% at 50% 42%, black 35%, transparent 74%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 56% at 50% 42%, black 35%, transparent 74%)",
            }}
          />
        </div>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-4xl text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Always free for friends.
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-xl text-sm font-medium text-white/60 sm:text-base">
          Big trip or small dinner. Full expense splitting with no per-member
          fees, no trial periods, and no feature gates.
        </p>
      </header>

      {/* Plan columns: open text layout like the reference, no card boxes */}
      <section className="mx-auto grid max-w-6xl gap-14 px-6 md:grid-cols-2 md:gap-20">
        {PLANS.map((plan) => (
          <div key={plan.name} className="flex flex-col items-start">
            <h2 className="font-serif-premium text-3xl font-normal tracking-tight sm:text-4xl">
              {plan.name}
            </h2>
            <p className="font-serif-premium mt-8 text-3xl font-normal tracking-tight text-white/95 sm:mt-10 sm:text-4xl">
              {plan.price}
            </p>
            <p className="mt-5 max-w-md flex-1 text-sm leading-relaxed text-white/55 sm:text-[15px]">
              {plan.blurb}
            </p>
            <button
              onClick={() => router.push(plan.href)}
              className={`clickable mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-transform duration-200 hover:scale-[1.02] ${
                plan.featured
                  ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                  : "bg-white text-black"
              }`}
            >
              {plan.cta}
              <ArrowRight size={15} />
            </button>
          </div>
        ))}
      </section>

      {/* Feature comparison */}
      <section className="mx-auto max-w-6xl px-6 pt-28 sm:pt-36">
        <h2 className="font-serif-premium text-4xl font-normal tracking-tight sm:text-5xl">
          Compare features
        </h2>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-[44%] pb-5 pr-4 align-bottom text-sm font-medium text-white/40">
                  Features
                </th>
                {PLANS.map((plan) => (
                  <th key={plan.name} className="w-[28%] px-4 pb-5 align-bottom font-normal">
                    <p className="text-base font-semibold text-white sm:text-lg">{plan.name}</p>
                    <p className="mt-1 text-sm text-white/40">{plan.price}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((group) => (
                <Fragment key={group.title}>
                  <tr>
                    <td colSpan={3} className="pb-3 pt-14">
                      <p className="text-lg font-bold text-white sm:text-xl">{group.title}</p>
                      <p className="mt-1 text-sm text-white/40">{group.blurb}</p>
                    </td>
                  </tr>
                  {group.rows.map(([feature, free, pro]) => (
                    <tr key={feature} className="border-b border-white/[0.08]">
                      <td className="py-5 pr-4 text-sm text-white/90 sm:text-[15px]">{feature}</td>
                      <td className="px-4 py-5">
                        <FeatureCell value={free} />
                      </td>
                      <td className="px-4 py-5">
                        <FeatureCell value={pro} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 pt-24 sm:pt-32">
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          FAQ
        </p>
        <h2 className="font-serif-premium mt-3 text-center text-3xl font-normal tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10">
          {FAQS.map((faq, i) => (
            <FaqItem
              key={faq.q}
              faq={faq}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 py-28 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Ready to get started?
        </h2>
        <button
          onClick={() => router.push("/register")}
          className="clickable mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
        >
          Get started
          <ArrowRight size={16} />
        </button>
      </section>

      <Footer />
    </div>
  );
}
