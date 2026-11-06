"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown, ArrowRight, Sparkles, ScanLine, Handshake,
  MessagesSquare, QrCode, ShieldCheck, Layers, Wand2,
} from "lucide-react";
import styles from "./FeaturesMenu.module.css";

const FEATURES = [
  { href: "/features/ai-expense-splitter", icon: Sparkles,       label: "AI Expense Splitter", desc: "Split any bill in plain language" },
  { href: "/features/smart-settlements",   icon: Handshake,      label: "Smart Settlements",   desc: "Fewest payments to settle up" },
  { href: "/features/ocr-receipt-scan",    icon: ScanLine,       label: "OCR Receipt Scan",    desc: "Snap a receipt, items auto-read" },
  { href: "/features/group-chat-hub",      icon: MessagesSquare, label: "Group Chat Hub",      desc: "Chat right next to your expenses" },
  { href: "/features/qr-invites",          icon: QrCode,         label: "QR & Link Invites",   desc: "Add friends with a scan or a link" },
  { href: "/features/secure-login",        icon: ShieldCheck,    label: "Secure OTP Login",    desc: "Passwordless, verified sign-in" },
  { href: "/features/autopilot",           icon: Wand2,          label: "Autopilot",           desc: "Ask once, review, approve" },
];

/* Android robot in Android's own green. */
const ANDROID_GREEN = "#3DDC84";
function AndroidMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={ANDROID_GREEN} aria-hidden="true">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

/* The assistants the MCP server connects to, as a small overlapping stack. */
const AI_MARKS = [
  { src: "/mcp/claude.png", name: "Claude" },
  { src: "/mcp/chatgpt.png", name: "ChatGPT" },
  { src: "/mcp/gemini.png", name: "Gemini" },
];
function AiMarks() {
  return (
    <span style={{ display: "flex" }} aria-label="Claude, ChatGPT and Gemini">
      {AI_MARKS.map((m, i) => (
        <span
          key={m.name}
          title={m.name}
          style={{
            display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%",
            background: "#0b0e11", border: "1px solid #ffffff1f", marginLeft: i ? -7 : 0, position: "relative", zIndex: AI_MARKS.length - i,
          }}
        >
          <img src={m.src} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
        </span>
      ))}
    </span>
  );
}

const PLATFORMS = [
  { href: "/mobile-app", icon: AndroidMark, label: "Mobile App", badge: "Android", badgeColor: ANDROID_GREEN, desc: "Every group and settlement in your pocket" },
  { href: "/mcp",        icon: AiMarks,     label: "MCP Server", badge: "AI",      desc: "Connect Claude, ChatGPT, Gemini & more" },
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
            <div className={styles.sectionLabel}><span className={styles.accentDot} /> BUILT FOR SHARING <span>{String(FEATURES.length).padStart(2, "0")} FEATURES</span></div>
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
              {PLATFORMS.map(({ href, icon: Icon, label, badge, badgeColor, desc }) => <Link key={href} href={href} onClick={close} className={styles.platformLink} aria-current={pathname === href ? "page" : undefined}>
                <div className={styles.platformTop}>
                  <span className={styles.platformIcon}><Icon /></span>
                  <span className={styles.badge} style={badgeColor ? { color: badgeColor, borderColor: `${badgeColor}40`, background: `${badgeColor}0f` } : undefined}>{badge}</span>
                </div>
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
