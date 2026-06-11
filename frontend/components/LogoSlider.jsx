"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Star, Globe } from "lucide-react";

const logos = [
  { src: "/airbnb.png", name: "Airbnb" },
  { src: "/splitwise.png", name: "Splitwise" },
  { src: "/expedia.png", name: "Expedia" },
  { src: "/skyscanner.png", name: "Skyscanner" },
  { src: "/tripadvisor.png", name: "Tripadvisor" },
  { src: "/kayak.png", name: "Kayak" },
  { src: "/trivago.png", name: "Trivago" },
];

const stats = [
  { icon: Users, value: "2,000+", label: "Active Groups", color: "#0891B2" },
  { icon: TrendingUp, value: "₹50L+", label: "Total Split", color: "#0E7490" },
  { icon: Star, value: "4.9 / 5", label: "User Rating", color: "#f59e0b" },
  { icon: Globe, value: "120+", label: "Cities Covered", color: "#ec4899" },
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
      className={`h-14 sm:h-18 w-auto object-contain transition-all duration-300 ease-out select-none cursor-pointer ${
        hovered
          ? "grayscale-0 brightness-100 invert-0 opacity-100 scale-115"
          : "grayscale brightness-0 invert opacity-55"
      }`}
      draggable={false}
    />
  );
}

export default function LogoSlider() {
  return (
    <section className="relative py-12 overflow-hidden bg-[#030303]">

      {/* Ambient background blend */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#030303] to-[#030303] z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 mb-8">
        <p className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
          Used alongside your favorite platforms
        </p>
      </div>

      {/* ── Logo strip (full-width marquee) ── */}
      <div className="relative overflow-hidden w-full z-10">
        {/* Left fade */}
        <div 
          className="absolute left-0 top-0 h-full w-32 pointer-events-none z-20"
          style={{ background: "linear-gradient(to right, #030303 15%, transparent)" }} 
        />
        {/* Right fade */}
        <div 
          className="absolute right-0 top-0 h-full w-32 pointer-events-none z-20"
          style={{ background: "linear-gradient(to left, #030303 15%, transparent)" }} 
        />

        <div className="flex items-center gap-12 animate-logo-scroll" style={{ width: "max-content", willChange: "transform" }}>
          {[...Array(3)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-20 pr-20">
              {logos.map(({ src, name }, i) => (
                <LogoItem
                  key={`${setIdx}-${i}`}
                  src={src}
                  name={name}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
