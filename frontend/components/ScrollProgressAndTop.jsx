"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import styles from "./ScrollProgressAndTop.module.css";

export default function ScrollProgressAndTop() {
  const progress = useMotionValue(0);
  const offset = useTransform(progress, (value) => 1 - value);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const percentRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    let maximum = 1;
    let wasVisible = false;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const value = Math.min(1, Math.max(0, y / maximum));
      progress.set(value);
      if (percentRef.current) percentRef.current.textContent = `${Math.round(value * 100)}%`;
      const next = y > 400;
      if (next !== wasVisible) { wasVisible = next; setVisible(next); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      schedule();
    };
    // Refresh the range when lazy landing sections change the page height.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(document.documentElement);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, [progress]);

  const scrollToTop = () => {
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(0, { duration: reduced ? 0 : .9, immediate: !!reduced });
    else window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  };

  return <AnimatePresence>
    {visible && <motion.button type="button" className={styles.button} onClick={scrollToTop} aria-label="Back to top" title="Back to top"
      initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 10 }} transition={{ duration: reduced ? 0 : .18 }}>
      <span className={styles.surface} aria-hidden="true"><motion.span className={styles.fill} style={{ scaleY: progress }} /></span>
      <svg className={styles.ring} viewBox="0 0 64 64" aria-hidden="true">
        <circle className={styles.track} cx="32" cy="32" r="28" />
        <motion.circle className={styles.progress} cx="32" cy="32" r="28" pathLength="1" strokeDasharray="1 1" style={{ strokeDashoffset: offset }} />
      </svg>
      <span className={styles.content} aria-hidden="true"><ArrowUp size={19} strokeWidth={1.8} /><span ref={(node) => { percentRef.current = node; if (node) node.textContent = `${Math.round(progress.get() * 100)}%`; }} className={styles.percent}>0%</span></span>
    </motion.button>}
  </AnimatePresence>;
}
