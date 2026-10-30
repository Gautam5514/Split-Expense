"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown, ArrowRight, Sparkles, ScanLine, Handshake,
  MessagesSquare, QrCode, ShieldCheck, Smartphone, Plug, Layers,
} from "lucide-react";

const FEATURES = [
  { href: "/features/ai-expense-splitter", icon: Sparkles,       label: "AI Expense Splitter", desc: "Split any bill in plain language",   tint: "from-cyan-400/25 to-cyan-600/5 text-cyan-300" },
  { href: "/features/smart-settlements",   icon: Handshake,      label: "Smart Settlements",   desc: "Fewest payments to settle up",       tint: "from-emerald-400/25 to-emerald-600/5 text-emerald-300" },
  { href: "/features/ocr-receipt-scan",    icon: ScanLine,       label: "OCR Receipt Scan",    desc: "Snap a receipt, items auto-read",    tint: "from-amber-400/25 to-amber-600/5 text-amber-300" },
  { href: "/features/group-chat-hub",      icon: MessagesSquare, label: "Group Chat Hub",      desc: "Chat right next to your expenses",   tint: "from-violet-400/25 to-violet-600/5 text-violet-300" },
  { href: "/features/qr-invites",          icon: QrCode,         label: "QR & Link Invites",   desc: "Add friends with a scan or a link",  tint: "from-sky-400/25 to-sky-600/5 text-sky-300" },
  { href: "/features/secure-login",        icon: ShieldCheck,    label: "Secure OTP Login",    desc: "Passwordless, verified sign-in",     tint: "from-rose-400/25 to-rose-600/5 text-rose-300" },
];

const PLATFORMS = [
  { href: "/mobile-app", icon: Smartphone, label: "Mobile App", badge: "Android", desc: "Every group and settlement in your pocket" },
  { href: "/mcp",  icon: Plug,       label: "MCP Server", badge: "AI",      desc: "Connect Claude, ChatGPT, Gemini & more" },
];

export default function FeaturesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const hoverIn = () => { clearTimeout(timer.current); setOpen(true); };
  const hoverOut = () => { timer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div ref={ref} className="sm:relative" onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all hover:bg-white/5 ${
          open ? "text-white bg-white/5" : "text-white/70 hover:text-white"
        }`}
      >
        Features
        <ChevronDown size={13} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-3 top-[62px] sm:absolute sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:pt-3 z-50 sm:w-[640px] max-w-[calc(100vw-1.5rem)]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] max-h-[calc(100vh-90px)] overflow-y-auto">
              <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />

              <div className="relative grid sm:grid-cols-[1.35fr_1fr]">
                {/* Features */}
                <div className="p-3 sm:p-4">
                  <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Features</p>
                  <ul className="space-y-0.5">
                    {FEATURES.map(({ href, icon: Icon, label, desc, tint }) => (
                      <li key={href}>
                        <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.06]">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10 ${tint}`}>
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-white/90 group-hover:text-white">{label}</span>
                            <span className="block truncate text-[11px] text-white/40">{desc}</span>
                          </span>
                          <ArrowRight size={14} className="shrink-0 -translate-x-1 text-white/0 transition-all group-hover:translate-x-0 group-hover:text-cyan-300" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Apps & AI */}
                <div className="border-t border-white/[0.06] bg-white/[0.02] p-3 sm:border-l sm:border-t-0 sm:p-4">
                  <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">App &amp; AI</p>
                  <div className="space-y-2">
                    {PLATFORMS.map(({ href, icon: Icon, label, badge, desc }) => (
                      <Link
                        key={href}
                        href={href}
                        className="group relative block overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-[0_8px_30px_rgba(34,211,238,0.12)]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20">
                            <Icon size={16} />
                          </span>
                          <span className="text-[13px] font-semibold text-white">{label}</span>
                          <span className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">{badge}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-white/45">{desc}</p>
                      </Link>
                    ))}
                  </div>
                  <Link href="/platforms" className="group mt-3 flex items-center justify-between rounded-xl px-2 py-2 text-[12px] font-semibold text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white">
                    <span className="flex items-center gap-2"><Layers size={14} /> Explore all platforms</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
