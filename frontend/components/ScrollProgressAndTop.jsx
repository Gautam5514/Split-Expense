"use client";

import { motion, useScroll, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollProgressAndTop() {
  const { scrollYProgress } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  // Show button when scrolled down more than 10%
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsVisible(latest > 0.1);
  });

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Horizontal Scroll Progress Bar at the top of the viewport */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-cyan-500 origin-left z-[9999]"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Back to Top Button with Circular Progress Ring */}
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={scrollToTop}
            className="group fixed bottom-6 right-6 z-[9999] w-11 h-11 rounded-full bg-card/30 dark:bg-card/20 backdrop-blur-xl border border-border/40 hover:bg-card/45 dark:hover:bg-card/35 shadow-lg hover:shadow-primary/20 flex items-center justify-center text-primary cursor-pointer transition-shadow focus:outline-none"
            aria-label="Back to top"
          >
            {/* SVG Circle Progress indicator around the button border */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5" viewBox="0 0 100 100">
              {/* Background track */}
              <circle
                cx="50"
                cy="50"
                r="46"
                className="stroke-muted/10 dark:stroke-muted/5 fill-none"
                strokeWidth="3"
              />
              {/* Dynamic progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="46"
                className="stroke-primary fill-none"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                  pathLength: scrollYProgress,
                }}
              />
            </svg>
            
            {/* Icon pointing up */}
            <ArrowUp className="w-4 h-4 z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
