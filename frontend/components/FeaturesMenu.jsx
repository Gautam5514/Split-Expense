"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown, ArrowRight, Sparkles, ScanLine, Handshake,
  MessagesSquare, QrCode, ShieldCheck, Smartphone, Plug, Layers,
} from "lucide-react";
import styles from "./FeaturesMenu.module.css";

const FEATURES = [
  { href: "/features/ai-expense-splitter", icon: Sparkles,       label: "AI Expense Splitter", desc: "Split any bill in plain language" },
  { href: "/features/smart-settlements",   icon: Handshake,      label: "Smart Settlements",   desc: "Fewest payments to settle up" },
  { href: "/features/ocr-receipt-scan",    icon: ScanLine,       label: "OCR Receipt Scan",    desc: "Snap a receipt, items auto-read" },
  { href: "/features/group-chat-hub",      icon: MessagesSquare, label: "Group Chat Hub",      desc: "Chat right next to your expenses" },
  { href: "/features/qr-invites",          icon: QrCode,         label: "QR & Link Invites",   desc: "Add friends with a scan or a link" },
  { href: "/features/secure-login",        icon: ShieldCheck,    label: "Secure OTP Login",    desc: "Passwordless, verified sign-in" },
];

const PLATFORMS = [
  { href: "/mobile-app", icon: Smartphone, label: "Mobile App", badge: "Android", desc: "Every group and settlement in your pocket" },
  { href: "/mcp",  icon: Plug,       label: "MCP Server", badge: "AI",      desc: "Connect Claude, ChatGPT, Gemini & more" },
];

export default function FeaturesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const timer = useRef(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const closeOutside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => {
      if (event.key === "Escape" && ref.current?.contains(document.activeElement)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const close = () => { clearTimeout(timer.current); setOpen(false); };
  return <div ref={ref} className={styles.root}
    onMouseEnter={() => { clearTimeout(timer.current); setOpen(true); }}
    onMouseLeave={() => { if (!ref.current?.contains(document.activeElement)) timer.current = setTimeout(() => setOpen(false), 160); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <button ref={triggerRef} type="button" aria-expanded={open} aria-controls="features-navigation"
      onClick={() => { clearTimeout(timer.current); setOpen((value) => !value); }}
      onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => ref.current?.querySelector("a")?.focus()); } }}
      className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}>
      Features <ChevronDown size={13} className={styles.chevron} />
    </button>
    <AnimatePresence>
      {open && <motion.div className={styles.positioner}
        initial={{ opacity: 0, y: reduced ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 4 }} transition={{ duration: reduced ? 0 : .16 }}>
        <nav id="features-navigation" aria-label="Features and platforms" className={styles.panel}>
          <div className={styles.features}>
            <div className={styles.sectionLabel}><span className={styles.accentDot} /> BUILT FOR SHARING <span>06 FEATURES</span></div>
            <div className={styles.intro}>A little less to keep track of.</div>
            <ul className={styles.featureGrid}>
              {FEATURES.map(({ href, icon: Icon, label, desc }) => <li key={href}>
                <Link href={href} onClick={close} className={styles.featureLink} aria-current={pathname === href ? "page" : undefined}>
                  <span className={styles.icon}><Icon size={18} strokeWidth={1.6} /></span>
                  <span className={styles.linkCopy}><span className={styles.linkTitle}>{label}</span><span className={styles.description}>{desc}</span></span>
                  <ArrowRight size={13} className={styles.linkArrow} />
                </Link>
              </li>)}
            </ul>
            <Link href="/what-we-offer" onClick={close} className={styles.bottomLink}>Discover what SplitEase can do <ArrowRight size={13} /></Link>
          </div>
          <div className={styles.platforms}>
            <div className={styles.sectionLabel}>BEYOND YOUR BROWSER</div>
            <div className={styles.platformList}>
              {PLATFORMS.map(({ href, icon: Icon, label, badge, desc }) => <Link key={href} href={href} onClick={close} className={styles.platformLink} aria-current={pathname === href ? "page" : undefined}>
                <div className={styles.platformTop}><span className={styles.platformIcon}><Icon size={18} strokeWidth={1.6} /></span><span className={styles.badge}>{badge}</span></div>
                <span className={styles.platformTitle}>{label}<ArrowRight size={13} /></span>
                <span className={styles.description}>{desc}</span>
              </Link>)}
            </div>
            <Link href="/platforms" onClick={close} className={styles.allPlatforms}><Layers size={14} /> All platforms <ArrowRight size={13} /></Link>
          </div>
        </nav>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
