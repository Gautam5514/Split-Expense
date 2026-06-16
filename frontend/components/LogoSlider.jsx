"use client";

import { useState } from "react";

const logos = [
  { src: "/airbnb.png", name: "Airbnb" },
  { src: "/splitwise.png", name: "Splitwise" },
  { src: "/expedia.png", name: "Expedia" },
  { src: "/skyscanner.png", name: "Skyscanner" },
  { src: "/tripadvisor.png", name: "Tripadvisor" },
  { src: "/kayak.png", name: "Kayak" },
  { src: "/trivago.png", name: "Trivago" },
];

function LogoItem({ src, name }) {
  const [hovered, setHovered] = useState(false);
  // Using v=5 to force reload the newly cropped transparent PNG assets from disk
  const imageSrc = `${src}?v=5`;

  return (
    <img
      src={imageSrc}
      alt={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Smaller height keeps the low-res brand art looking crisp; a single
      // muted white treatment unifies them, brightening gently on hover.
      className={`h-7 w-auto select-none object-contain brightness-0 grayscale invert transition-all duration-300 ease-out sm:h-8 ${
        hovered ? "scale-110 opacity-95" : "opacity-45"
      }`}
      draggable={false}
    />
  );
}

export default function LogoSlider() {
  return (
    <section className="relative overflow-hidden bg-[#030303] py-14 sm:py-16">
      {/* hairline-framed label */}
      <div className="mx-auto mb-10 flex max-w-xl items-center gap-4 px-6 sm:mb-12">
        <span className="h-px flex-1 bg-white/10" />
        <p className="whitespace-nowrap text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white/35 sm:text-[11px]">
          Used alongside your favorite platforms
        </p>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* ── Logo strip (full-width marquee) ── */}
      <div className="relative z-10 w-full overflow-hidden">
        {/* Edge fades */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-20 h-full w-20 sm:w-40"
          style={{ background: "linear-gradient(to right, #030303, transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 z-20 h-full w-20 sm:w-40"
          style={{ background: "linear-gradient(to left, #030303, transparent)" }}
        />

        <div className="flex w-max items-center animate-logo-scroll" style={{ willChange: "transform" }}>
          {[...Array(3)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-14 pr-14 sm:gap-20 sm:pr-20">
              {logos.map(({ src, name }, i) => (
                <LogoItem key={`${setIdx}-${i}`} src={src} name={name} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
