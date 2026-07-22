"use client";

import { Moon, Sun } from "lucide-react";
import useTheme from "@/hooks/useTheme";

/* Pill-style light/dark switch: a sliding knob parks over the icon for the
   active mode. Both icons stay visible so the control reads as a switch
   rather than a button whose meaning you have to guess. Sizing is exact -
   the knob centre lands on each icon centre at both ends of the track. */

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full border border-foreground/10 bg-foreground/[0.07] transition-colors duration-300 hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${className}`}
    >
      {/* Sliding knob */}
      <span
        aria-hidden
        className={`absolute left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out ${
          isDark ? "translate-x-0" : "translate-x-[24px]"
        }`}
      />

      {/* Icons render above the knob; the active one goes dark for contrast */}
      <span className="relative z-10 flex w-full items-center justify-between px-2">
        <Moon
          size={12}
          strokeWidth={2.5}
          className={`transition-colors duration-300 ${isDark ? "text-[#0B0B0F]" : "text-foreground/40"}`}
        />
        <Sun
          size={12}
          strokeWidth={2.5}
          className={`transition-colors duration-300 ${isDark ? "text-foreground/40" : "text-[#0B0B0F]"}`}
        />
      </span>
    </button>
  );
}
