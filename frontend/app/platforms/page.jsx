"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Globe, Plug, Smartphone } from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import PageHeroShell from "@/components/PageHeroShell";
import { PlayStoreButton } from "@/components/PlayStoreLink";

/* Platforms page: the three ways to use SplitEase (web app, mobile app, MCP),
   what each one is good for, and a short FAQ. */

const PLATFORMS = [
  {
    id: "web",
    icon: Globe,
    eyebrow: "On the web",
    name: "Web app",
    desc: "Open SplitEase in any modern browser on your phone, tablet or desktop. Nothing to install, and your groups are always in sync.",
    points: ["Groups, splits, chat and settlements", "Spending charts and a live balance dashboard", "Works on phone, tablet and desktop"],
    cta: "Open web app",
    href: "/register",
  },
  {
    id: "app",
    icon: Smartphone,
    eyebrow: "In your pocket",
    name: "Mobile app",
    desc: "The Android app keeps every group, chat and settlement one tap away, with notifications when something new lands.",
    points: ["Push notifications for new expenses", "Works offline, syncs when you are back", "Attach receipt photos on the spot"],
    cta: "Get the app",
    href: "/mobile-app",
  },
  {
    id: "mcp",
    icon: Plug,
    eyebrow: "With your assistant",
    name: "MCP",
    desc: "Connect your SplitEase account to an AI assistant such as Claude, ChatGPT, Gemini, Grok or Copilot, and ask about your money in plain language.",
    points: ["See your groups and balances", "Check recent expenses in any group", "Get an overall summary across groups", "Create a new group by asking"],
    cta: "Connect your assistant",
    href: "/mcp-login",
  },
];

const FAQS = [
  {
    q: "Which one should I start with?",
    a: "The web app. Sign up with your email or Google account, create a group and invite friends. You can add the mobile app or MCP any time, and everything stays in sync.",
  },
  {
    q: "Do the web app, mobile app and MCP share the same data?",
    a: "Yes. They all use the same account, so a group you create on the web shows up in the app and in your assistant straight away.",
  },
  {
    q: "What is MCP?",
    a: "MCP lets an AI assistant talk to SplitEase on your behalf. You log in once, copy your secure token and paste it into the assistant. After that you can ask things like who owes what in a group.",
  },
  {
    q: "Is it free to use?",
    a: "Yes. The web app, the mobile app and MCP are all free to use right now, with no card needed.",
  },
  {
    q: "Is the mobile app on iPhone too?",
    a: "The app is available on Android today. On iPhone you can use the web app in your browser.",
  },
];

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

export default function PlatformsPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-black text-white">
      <SmoothScroll />

      <PageHeroShell as="header" fadeBottom className="pb-40 pt-28 sm:pb-56 sm:pt-36">
        <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">Web · App · MCP</p>
        <h1 className="font-serif-premium font-normal text-white text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05] mb-6">
          Use SplitEase wherever you are
        </h1>
        <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/60 sm:text-base md:text-lg">
          On the web, on your phone, or through your AI assistant. One account,
          the same groups everywhere, free to use.
        </p>
      </PageHeroShell>

      {/* The three ways in */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {PLATFORMS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0A0A0E] p-6 transition-colors duration-500 hover:border-cyan-400/35 sm:p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-colors duration-500 group-hover:bg-cyan-400/15 group-hover:text-cyan-200">
                <item.icon size={22} />
              </span>
              <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">{item.eyebrow}</p>
              <h2 className="font-serif-premium mt-2 text-3xl font-normal tracking-tight">{item.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{item.desc}</p>
              <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/[0.08] pt-5">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-cyan-400" />
                    {point}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(item.href)}
                className="clickable mt-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-white/15"
              >
                {item.cta}
                <ArrowRight size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 pt-24 sm:pt-32">
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">FAQ</p>
        <h2 className="font-serif-premium mt-3 text-center text-3xl font-normal tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10">
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.q} faq={faq} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 py-28 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Start splitting today
        </h2>
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.push("/register")}
            className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
          >
            Get started
            <ArrowRight size={16} />
          </button>
          <PlayStoreButton />
        </div>
      </section>

      <Footer />
    </div>
  );
}
