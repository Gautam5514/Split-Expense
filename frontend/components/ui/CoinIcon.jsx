"use client";

import { useId } from "react";

const STAR = "M32.00 21.50 L34.59 28.44 L41.99 28.76 L36.18 33.36 L38.17 40.49 L32.00 36.40 L25.83 40.49 L27.82 33.36 L22.01 28.76 L29.41 28.44 Z";

/* A minted gold coin: thick edge, raised rim, shaded face, embossed star and
   a soft highlight. Used wherever reward coins are shown - the same drawing
   as the mobile app's CoinIcon. `size` is a number (px) or any CSS length. */
export default function CoinIcon({ size = 20, className = "" }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rim = `rim${id}`, face = `face${id}`, edge = `edge${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={rim} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#FFF0B8" />
          <stop offset="0.45" stopColor="#F6B93B" />
          <stop offset="1" stopColor="#B4690E" />
        </linearGradient>
        <radialGradient id={face} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFF4C7" />
          <stop offset="0.5" stopColor="#FBC94A" />
          <stop offset="1" stopColor="#D88C12" />
        </radialGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9620B" />
          <stop offset="1" stopColor="#74400A" />
        </linearGradient>
      </defs>

      {/* thickness: the coin's edge peeking out underneath */}
      <circle cx="32" cy="35.5" r="27" fill={`url(#${edge})`} />
      {/* raised rim */}
      <circle cx="32" cy="31.5" r="27" fill={`url(#${rim})`} />
      {/* groove between rim and face */}
      <circle cx="32" cy="31.5" r="22.4" fill="none" stroke="#9A5A08" strokeOpacity="0.55" strokeWidth="1.2" />
      {/* face */}
      <circle cx="32" cy="31.5" r="21.4" fill={`url(#${face})`} />
      <circle cx="32" cy="31.5" r="20.6" fill="none" stroke="#FFF7DB" strokeOpacity="0.55" strokeWidth="0.9" />

      {/* embossed star: light edge below, dark body on top */}
      <path d={STAR} fill="#FFF3C4" fillOpacity="0.75" transform="translate(0 0.6)" />
      <path d={STAR} fill="#B26B0B" transform="translate(0 -0.5)" />

      {/* soft highlight, upper left */}
      <ellipse cx="23" cy="19" rx="11" ry="5" fill="#FFFFFF" fillOpacity="0.32" transform="rotate(-32 23 19)" />
    </svg>
  );
}
