"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Heaviest component on the page (1.3k lines). It renders BELOW the headline
// and floats in with a delay, so we code-split it out of the initial bundle
// and stream it in — the hero text + CTA become interactive immediately.
const InteractiveDashboardSimulator = dynamic(
  () => import("./InteractiveDashboardSimulator"),
  { ssr: false, loading: () => <div className="min-h-[420px] w-full sm:min-h-[560px]" /> }
);

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden flex flex-col bg-black text-white pt-24 sm:pt-28 pb-12 sm:pb-20">

      {/* Background Gradients matching obsidianos.com */}
      <div className="absolute inset-x-0 top-0 -bottom-[164px] z-0" style={{ background: "linear-gradient(180deg, #000 0%, #2F2C2A 67%)" }} />
      <div className="pointer-events-none absolute top-[656px] -bottom-[42px] -left-[218px] -right-[218px] z-[4]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 83.35%)" }} />
      <div className="absolute inset-0 bg-radial-gradient(circle_at_center,rgba(8,145,178,0.03)_0%,transparent_70%) z-[1]" />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease: "easeOut" }}
          className="font-serif-premium font-normal text-[2.65rem] sm:text-6xl md:text-[4.5rem] lg:text-[5.35rem] tracking-tight leading-[1.06] text-center mb-6 max-w-7xl text-white"
        >
          <span className="lg:block lg:whitespace-nowrap">
            <span className="inline">Split </span>
            <span
              className="group relative mx-[0.08em] inline-flex h-[0.78em] w-[1.78em] translate-y-[0.08em] overflow-hidden rounded-[999px] border border-white/20 bg-white/10 align-baseline shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
              aria-hidden="true"
            >
              <img
                src="/hero-friends-expense.png"
                alt=""
                decoding="async"
                className="h-full w-full scale-[1.38] object-cover transition-transform duration-700 group-hover:scale-[1.46]"
              />
              <span className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/15" />
            </span>{" "}
            <span className="inline">with friends.</span>
          </span>
          <span className="lg:block lg:whitespace-nowrap">
            <span className="inline">Settle </span>
            <span
              className="group relative mx-[0.08em] inline-flex h-[0.72em] w-[1.55em] translate-y-[0.06em] overflow-hidden rounded-[999px] border border-white/20 bg-[#181818] align-baseline shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
              aria-hidden="true"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/hero-friends-expense.png"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              >
                <source
                  src="/hero_video.webm"
                  type="video/webm"
                />
              </video>
              <span className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-cyan-200/10" />
              <span className="absolute right-[0.12em] top-[0.12em] size-[0.09em] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            </span>{" "}
            <span className="inline">with ease.</span>
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="text-white/60 text-sm sm:text-base md:text-lg max-w-2xl text-center leading-relaxed mb-8 sm:mb-10 font-medium px-4"
        >
          Split expenses with your groups and settle up with smart settlement suggestions, available now with AI-powered receipt scanning coming soon.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.25, ease: "easeOut" }}
          className="mb-16 sm:mb-24"
        >
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3.5 rounded-full font-bold text-black bg-white hover:bg-white/95 transition-all hover:scale-105 active:scale-95 text-sm sm:text-base shadow-[0_4px_25px_rgba(255,255,255,0.18)] cursor-pointer"
          >
            Get Started For Free
          </button>
        </motion.div>

        {/* Floating Glassmorphic App Preview Simulator */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.45, type: "spring", stiffness: 45, damping: 16 }}
          className="w-full max-w-6xl mx-auto z-10 relative px-2 sm:px-0"
        >
          <div className="absolute -inset-1 rounded-2xl bg-cyan-500/5 blur-xl pointer-events-none" />
          <InteractiveDashboardSimulator />
        </motion.div>
      </div>

      {/* Flanking Rock Textures (In Background z-[5] to sit below the mockup card) */}
      <picture>
        <source srcSet="/stone-left.webp" type="image/webp" />
        <img
          src="/stone-left.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute max-w-none bottom-[-100px] left-[-140px] size-[844px] max-md:bottom-[0px] max-md:left-[-5%] max-md:size-[356px] max-xl:bottom-[-100px] max-xl:left-[-200px] z-[5]"
        />
      </picture>

      <picture>
        <source srcSet="/stone-right.webp" type="image/webp" />
        <img
          src="/stone-right.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute max-w-none right-[-820px] bottom-[-100px] h-[940px] w-[1500px] max-md:right-[-240px] max-md:bottom-[0px] max-md:size-[500px] max-xl:right-[-920px] max-xl:bottom-[-100px] z-[5]"
        />
      </picture>
    </section>
  );
}
