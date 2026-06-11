"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";

// Pages where the custom animated cursor is enabled
const CURSOR_PAGES = ["/", "/login", "/register", "/reset-password", "/contact", "/privacy", "/terms", "/help-center", "/helps", "/downloadapp"];

export default function CustomCursor() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Motion values for coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth out the coordinates using springs for trailing lag
  const springConfig = { stiffness: 280, damping: 30, mass: 0.4 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  // Determine if custom cursor should be active on current route
  const isCursorEnabled = CURSOR_PAGES.includes(pathname);

  useEffect(() => {
    // Disable custom cursor on touch screens/mobile devices
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice || !isCursorEnabled) return;

    const moveCursor = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Track when hovering over clickable elements
    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      const isClickable =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest(".clickable") ||
        target.closest("[role='button']") ||
        window.getComputedStyle(target).cursor === "pointer";

      setIsHovered(!!isClickable);
    };

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [mouseX, mouseY, isVisible, isCursorEnabled]);

  // On route change away from cursor pages, reset visibility
  useEffect(() => {
    if (!isCursorEnabled) {
      setIsVisible(false);
      setIsHovered(false);
      setIsClicking(false);
    }
  }, [isCursorEnabled]);

  // Don't render anything if not on a cursor-enabled page or cursor not yet visible
  if (!isCursorEnabled || !isVisible) return null;

  return (
    <>
      {/* Hide native cursor only on cursor-enabled pages */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (pointer: fine) {
          body, html, a, button, input, textarea, [role="button"], .clickable {
            cursor: none !important;
          }
        }
      `}} />

      {/* Central classic dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-cyan-400 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
        }}
        animate={{
          scale: isClicking ? 0.7 : isHovered ? 1.4 : 1,
        }}
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
      />

      {/* Outer Spring lagging ring */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border border-cyan-400/40 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{
          x: cursorX,
          y: cursorY,
          width: 32,
          height: 32,
        }}
        animate={{
          scale: isClicking ? 0.75 : isHovered ? 1.6 : 1,
          backgroundColor: isHovered ? "rgba(34, 211, 238, 0.06)" : "rgba(34, 211, 238, 0)",
          borderColor: isHovered ? "rgba(34, 211, 238, 0.85)" : "rgba(34, 211, 238, 0.4)",
        }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      />
    </>
  );
}
