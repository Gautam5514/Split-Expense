"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { usePathname } from "next/navigation";

/* One-element cursor: a white disc in `mix-blend-difference`, so it inverts
   whatever sits under it and stays readable on any background without picking
   a colour. It behaves like a drop of ink:
     - squashes and stretches along its direction of travel,
     - blooms into a large disc over links/buttons (the label under it inverts,
       which is the hover highlight - no ring needed),
     - collapses into a thin I-beam over text fields,
     - dents inward on press.
   All of it is one div driven by motion values, so nothing re-renders per frame. */

// Pages where the custom animated cursor is enabled
const CURSOR_PAGES = ["/", "/login", "/register", "/reset-password", "/contact", "/privacy", "/terms", "/help-center", "/helps", "/downloadapp"];

const BOX = 44; // base box in px; every state is a scale of this
const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

// scale targets per state: [x, y]
const SCALE = {
  idle: [0.22, 0.22],
  link: [1, 1],
  text: [0.07, 0.62],
  press: [0.15, 0.15],
  linkPress: [0.8, 0.8],
};

export default function CustomCursor() {
  const pathname = usePathname();
  const [mode, setMode] = useState("idle"); // idle | link | text
  const [isDown, setIsDown] = useState(false);
  const awakeRef = useRef(false); // first real mouse move happened
  const modeRef = useRef("idle");
  const angleRef = useRef(0);

  const isCursorEnabled = CURSOR_PAGES.includes(pathname);

  // Raw pointer position, then a tight spring so the disc trails by a hair.
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const x = useSpring(mouseX, { stiffness: 900, damping: 55, mass: 0.5 });
  const y = useSpring(mouseY, { stiffness: 900, damping: 55, mass: 0.5 });

  // Velocity drives both the tilt and the amount of squash/stretch.
  const vx = useVelocity(x);
  const vy = useVelocity(y);

  const angle = useTransform([vx, vy], ([dx, dy]) => {
    // Below walking speed the direction is noise, so hold the last one.
    if (Math.hypot(dx, dy) > 80) angleRef.current = (Math.atan2(dy, dx) * 180) / Math.PI;
    return angleRef.current;
  });

  const speed = useTransform([vx, vy], ([dx, dy]) => Math.min(Math.hypot(dx, dy), 3200));
  const stretch = useSpring(useTransform(speed, [0, 3200], [1, 1.3]), {
    stiffness: 260,
    damping: 26,
  });

  // Base size lives in springs so state changes ease instead of snapping.
  const baseX = useSpring(SCALE.idle[0], { stiffness: 420, damping: 32 });
  const baseY = useSpring(SCALE.idle[1], { stiffness: 420, damping: 32 });
  const opacity = useSpring(0, { stiffness: 300, damping: 34 });

  const scaleX = useTransform([baseX, stretch], ([b, s]) =>
    modeRef.current === "text" ? b : b * s
  );
  const scaleY = useTransform([baseY, stretch], ([b, s]) =>
    modeRef.current === "text" ? b : b / s
  );

  useEffect(() => {
    modeRef.current = mode;
    const key = isDown ? (mode === "link" ? "linkPress" : mode === "text" ? "text" : "press") : mode;
    const [sx, sy] = SCALE[key] || SCALE.idle;
    baseX.set(sx);
    baseY.set(sy);
    // isCursorEnabled re-syncs the springs after a route reset parked them.
  }, [mode, isDown, isCursorEnabled, baseX, baseY]);

  useEffect(() => {
    // Pointer-driven only: skip touch screens and coarse pointers entirely.
    if (!isCursorEnabled) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const move = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!awakeRef.current) {
        // Jump the spring to the pointer so it doesn't fly in from the corner.
        x.jump(e.clientX);
        y.jump(e.clientY);
        awakeRef.current = true;
      }
      opacity.set(1);
    };

    const leave = () => opacity.set(0);
    const enter = () => opacity.set(1);
    const down = () => setIsDown(true);
    const up = () => setIsDown(false);

    const over = (e) => {
      const el = e.target;
      if (!el || el.nodeType !== 1) return;

      if (el.closest(TEXT_FIELDS)) return setMode("text");

      const clickable =
        el.closest("a, button, [role='button'], label, select, summary, .clickable") ||
        window.getComputedStyle(el).cursor === "pointer";

      setMode(clickable ? "link" : "idle");
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.addEventListener("mouseleave", leave);
    document.addEventListener("mouseenter", enter);
    window.addEventListener("blur", leave);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("mouseenter", enter);
      window.removeEventListener("blur", leave);

      // Navigating to a page without the cursor hands control back to the
      // native one; park the disc so returning starts clean instead of
      // flashing at the last position in the last state.
      awakeRef.current = false;
      opacity.jump(0);
      baseX.jump(SCALE.idle[0]);
      baseY.jump(SCALE.idle[1]);
    };
  }, [isCursorEnabled, mouseX, mouseY, x, y, opacity, baseX, baseY]);

  if (!isCursorEnabled) return null;

  return (
    <>
      {/* Hide the native cursor only where ours takes over. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media (pointer: fine) {
            html, body, a, button, input, textarea, select, label, summary,
            [role="button"], .clickable { cursor: none !important; }
          }`,
        }}
      />

      {/* position -> rotation -> scale, split across nodes so the stretch
          follows the travel direction instead of the screen axes. */}
      {/* The blend mode lives on the outer node on purpose: the transformed
          layers below it isolate blending, so a nested blob would invert
          against nothing and render solid white. */}
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference"
        style={{ x, y, opacity }}
      >
        <motion.div style={{ rotate: angle, width: BOX, height: BOX, margin: -BOX / 2 }}>
          <motion.div className="w-full h-full rounded-full bg-white" style={{ scaleX, scaleY }} />
        </motion.div>
      </motion.div>
    </>
  );
}
