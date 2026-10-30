"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/* Premium inertia scrolling for marketing pages. Mount once per page;
   renders nothing. Touch devices keep native scrolling and reduced-motion
   users are left untouched. */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    window.__lenis = lenis;

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (window.__lenis === lenis) window.__lenis = null;
      lenis.destroy();
    };
  }, []);

  return null;
}
