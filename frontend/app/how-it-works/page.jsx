"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  QrCode,
  ScanLine,
  Smartphone,
  Users,
} from "lucide-react";
import Footer from "@/components/Footer";

/* Dedicated walkthrough page: a snake roadmap from opening the app to
   settling up. One dotted line winds in S-curves through every step node,
   and a cyan line travels along it as you scroll. */

const STEPS = [
  {
    id: "signup",
    icon: Smartphone,
    eyebrow: "Open the app",
    title: "Create your account",
    desc: "Download Splitease or open it in the browser, then sign up with your email in under a minute. Your dashboard is ready the moment you land.",
    points: ["Email or Google sign-in", "No card, no setup fees", "Works on phone and desktop"],
  },
  {
    id: "create-group",
    icon: Users,
    eyebrow: "Start a group",
    title: "Create a group for anything",
    desc: "A Goa trip, monthly flat expenses, or a one-off dinner. Name the group, pick an emoji, and it becomes the single home for every shared cost.",
    points: ["Unlimited groups", "Trip, home, or custom budgets", "Group chat built in"],
  },
  {
    id: "invite",
    icon: QrCode,
    eyebrow: "Bring friends in",
    title: "Invite with QR, link, or email",
    desc: "Every group gets a custom QR code and invite link. Friends scan or tap and they are in. No complicated onboarding for anyone.",
    points: ["Scannable QR invites", "One-tap share links", "Email invites for the rest"],
  },
  {
    id: "add-expenses",
    icon: ScanLine,
    eyebrow: "Log expenses",
    title: "Add costs or scan the receipt",
    desc: "Type an expense in seconds, or snap a photo of any bill and the AI receipt scanner reads every line item through OCR and adds it for you.",
    points: ["Manual entry in two taps", "AI OCR receipt scanning", "Every item auto-categorized"],
  },
  {
    id: "split-math",
    icon: Calculator,
    eyebrow: "The math",
    title: "Split it any way you like",
    desc: "Choose equal, percentage, shares, or exact amounts per person. Splitease then nets everyone's balance, so you only ever see who owes whom.",
    points: ["Equal, percent, shares, or exact", "Balances netted automatically", "Minimum-transfer algorithm"],
    math: [
      ["Dinner at Thalassa", "₹2,400"],
      ["Split equally x 3", "₹800 each"],
      ["Priya paid the bill", "+₹2,400"],
      ["Felix owes Priya", "₹800"],
      ["Aarav owes Priya", "₹800"],
      ["Transfers needed", "2, not 6"],
    ],
  },
  {
    id: "settle-up",
    icon: CheckCircle2,
    eyebrow: "Settle up",
    title: "Clear every debt in one tap",
    desc: "When the trip ends, hit Settle Up. The optimizer routes the fewest possible UPI payments, records each one in the group chat, and zeroes the ledger.",
    points: ["Instant UPI settlement", "Payments logged in chat", "Balances reset to zero"],
  },
];

export default function HowItWorksPage() {
  const router = useRouter();
  const trackRef = useRef(null);
  const nodeRefs = useRef([]);
  const [snake, setSnake] = useState({ d: "", w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.75", "end 0.7"],
  });
  const lineProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  // Build one winding path through the center of every step node.
  useEffect(() => {
    const compute = () => {
      const track = trackRef.current;
      if (!track) return;
      const box = track.getBoundingClientRect();
      const pts = nodeRefs.current.filter(Boolean).map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
      });
      if (pts.length < 2) return;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1];
        const b = pts[i];
        const mid = (a.y + b.y) / 2;
        d += ` C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
      }
      setSnake({ d, w: box.width, h: box.height });
    };
    compute();
    const settle = setTimeout(compute, 700);
    window.addEventListener("resize", compute);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("resize", compute);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#030303] text-white">
      {/* Hero */}
      <header className="relative overflow-hidden px-6 pb-16 pt-36 text-center sm:pb-20 sm:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
          The complete walkthrough
        </p>
        <h1 className="font-serif-premium mx-auto max-w-3xl text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          From first open to fully settled
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-white/50 sm:text-base">
          Follow the road. Six stops take a brand-new group from sign-up to a
          zeroed ledger, with the math handled for you.
        </p>
      </header>

      {/* Snake roadmap */}
      <main ref={trackRef} className="relative mx-auto max-w-5xl px-6 pb-24 pt-6">
        {/* The winding dotted road + scroll-filled cyan line */}
        {snake.d && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={snake.w}
            height={snake.h}
            fill="none"
            aria-hidden
          >
            <path
              d={snake.d}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <motion.path
              d={snake.d}
              stroke="#22d3ee"
              strokeOpacity="0.9"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: lineProgress }}
            />
          </svg>
        )}

        <div className="space-y-20 sm:space-y-28">
          {STEPS.map((step, i) => {
            const left = i % 2 === 0;
            return (
              <section key={step.id} id={step.id} className="relative scroll-mt-36 md:grid md:grid-cols-2 md:gap-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`relative rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 pt-9 transition-colors duration-300 hover:border-cyan-400/30 sm:p-8 sm:pt-10 ${
                    left ? "md:col-start-1 md:mr-16" : "md:col-start-2 md:ml-16"
                  }`}
                >
                  {/* Node: the stop on the road, centered on the card's top edge */}
                  <div
                    ref={(el) => { nodeRefs.current[i] = el; }}
                    className="absolute -top-[1.4rem] left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-400/50 bg-[#030303] font-mono text-xs font-bold text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                  >
                    0{i + 1}
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
                      <step.icon size={20} />
                    </span>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                      {step.eyebrow}
                    </p>
                  </div>

                  <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-base">
                    {step.desc}
                  </p>

                  <ul className="mt-5 space-y-2">
                    {step.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-white/70">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  {step.math && (
                    <div className="mt-6 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs sm:text-[13px]">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                        Worked example
                      </p>
                      {step.math.map(([label, value], row) => (
                        <div
                          key={label}
                          className={`flex items-center justify-between py-1.5 ${
                            row === step.math.length - 1
                              ? "mt-2 border-t border-white/10 pt-3 text-cyan-400"
                              : "text-white/70"
                          }`}
                        >
                          <span>{label}</span>
                          <span className="font-bold">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 pb-28 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Ready to take the first step?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-white/50 sm:text-base">
          Create your first group free. The roadmap above takes most groups
          under five minutes end to end.
        </p>
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
