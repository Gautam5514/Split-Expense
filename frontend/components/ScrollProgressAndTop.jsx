"use client";

import { motion, useScroll, useSpring, useTransform, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 400;

export default function ScrollProgressAndTop() {
  const { scrollY } = useScroll();
  const [isVisible, setIsVisible] = useState(false);
  const percentRef = useRef(null);

  // Pixel threshold (not a % of the page): the home page is very long, so a
  // percentage made the button appear far too late.
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > SHOW_AFTER_PX;
    setIsVisible((prev) => (prev === next ? prev : next));
  });

  // Ring fills from the moment the button appears to the very bottom of the
  // page (so it always starts empty and ends completely full), then a light
  // spring smooths it. Recomputed per frame, so it survives content resizing.
  const raw = useTransform(scrollY, (y) => {
    if (typeof document === "undefined") return 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const span = Math.max(1, max - SHOW_AFTER_PX);
    return Math.min(1, Math.max(0, (y - SHOW_AFTER_PX) / span));
  });
  const scrollYProgress = useSpring(raw, { stiffness: 220, damping: 32, mass: 0.4 });

  // Percentage label is written straight to the DOM so it tracks every scroll
  // frame without re-rendering the component.
  const percent = useTransform(scrollYProgress, (v) => Math.round(Math.min(1, Math.max(0, v)) * 100));
  useMotionValueEvent(percent, "change", (v) => {
    if (percentRef.current) percentRef.current.textContent = `${v}%`;
  });

  // Fast, eased jump; goes through Lenis when active so the two scroll
  // engines don't fight each other.
  const scrollToTop = () => {
    const lenis = typeof window !== "undefined" ? window.__lenis : null;
    if (lenis) lenis.scrollTo(0, { duration: 0.9 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="group fixed bottom-6 right-6 z-[9999] flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-primary shadow-lg backdrop-blur-xl transition-shadow hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Back to top"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90 p-0.5" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="scroll-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" className="fill-none stroke-white/10" strokeWidth="5" />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#scroll-ring)"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ pathLength: scrollYProgress, filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))" }}
            />
          </svg>

          {/* arrow by default, live % on hover */}
          <ArrowUp className="z-10 h-4 w-4 transition-all duration-200 group-hover:-translate-y-2 group-hover:opacity-0" />
          <span
            ref={percentRef}
            className="absolute z-10 translate-y-2 font-mono text-[10px] font-bold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          >
            0%
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
