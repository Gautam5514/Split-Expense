"use client";

import { createElement } from "react";
import { GROUP_TYPES, groupTypeMeta } from "@/lib/groupPresets";

/**
 * Glossy 3D tile for a group type (app-icon style): a light-to-dark
 * gradient body, a soft top highlight, an inner bottom shade for depth, a
 * coloured drop glow, and the glyph with its own shadow. Pure CSS, so it
 * scales to any size and works in both themes.
 *
 * muted: greyed out (e.g. types you can't switch to).
 */
export default function GroupTypeIcon({ type, size = 48, muted = false, className = "" }) {
  const meta = groupTypeMeta(type);
  const [light, mid, dark] = meta.palette || GROUP_TYPES.general.palette;
  const radius = Math.round(size * 0.3);

  return (
    <span
      aria-hidden
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden transition ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(155deg, ${light} 0%, ${mid} 48%, ${dark} 100%)`,
        boxShadow: muted
          ? "inset 0 1px 0 rgba(255,255,255,0.4)"
          : [
              "inset 0 1.5px 0 rgba(255,255,255,0.55)",
              `inset 0 -${Math.round(size * 0.08)}px ${Math.round(size * 0.18)}px rgba(0,0,0,0.25)`,
              `0 ${Math.round(size * 0.2)}px ${Math.round(size * 0.34)}px -${Math.round(size * 0.12)}px ${meta.glow}`,
              "0 1px 2px rgba(0,0,0,0.12)",
            ].join(", "),
        filter: muted ? "grayscale(1)" : undefined,
        opacity: muted ? 0.45 : 1,
      }}
    >
      {/* Glossy highlight across the top half */}
      <span
        className="absolute left-[7%] right-[7%] top-[5%] h-[46%]"
        style={{
          borderRadius: Math.round(radius * 0.85),
          background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      {createElement(meta.Icon, {
        size: Math.round(size * 0.46),
        color: "#fff",
        strokeWidth: 2.3,
        className: "relative",
        style: { filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.3))" },
      })}
    </span>
  );
}
