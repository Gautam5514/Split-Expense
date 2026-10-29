"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SLIDES = [
  {
    id: "laptop",
    tag: "DESKTOP WEBAPP",
    title: "Widescreen Command Center",
    shortTitle: "Desktop command",
    desc: "Manage your group trips, calculate complex split percentages, and track overall spending profiles on a unified desktop interface built for power users.",
    imageSrc: "/laptop.webp",
    lineColor: "#22d3ee",
    glowColor: "rgba(34, 211, 238, 0.16)",
    features: ["Full screen overview of split ledgers", "Detailed graphical expense analytics", "Multi-group dashboard view"],
  },
  {
    id: "tablet",
    tag: "TABLET EXPERIENCE",
    title: "Lounge & Audit Comfort",
    shortTitle: "Tablet review",
    desc: "Review room audits and examine receipt details on a highly responsive tablet canvas. Settle balances from a couch, a hammock, or anywhere you unwind.",
    imageSrc: "/tablet.webp",
    lineColor: "#22d3ee",
    glowColor: "rgba(34, 211, 238, 0.16)",
    features: ["Interactive room balance visualizers", "Pinch-to-zoom scanned receipt viewer", "Quick swipe navigation between screens"],
  },
  {
    id: "mobile",
    tag: "MOBILE COMPANION",
    title: "Split on the Go",
    shortTitle: "Mobile companion",
    desc: "Log cost splits in seconds from the taxi, ticket line, or restaurant. Attach a receipt photo and confirm settlements directly from your phone.",
    imageSrc: "/mobile.webp",
    lineColor: "#22d3ee",
    glowColor: "rgba(34, 211, 238, 0.16)",
    features: ["Attach receipt photos to any expense", "QR & link invites to join instantly", "Two-party settlements confirmed in-app"],
  },
];

// Static masks plus transform/opacity animation make the fracture deterministic
// and allow the exact same pieces to reconnect when the user scrolls upward.
const SHARDS = [
  { clip: "polygon(0 0, 31% 0, 27% 34%, 0 39%)", x: -108, y: -72, r: -12 },
  { clip: "polygon(30% 0, 62% 0, 58% 31%, 27% 34%)", x: -22, y: -104, r: 8 },
  { clip: "polygon(61% 0, 100% 0, 100% 35%, 58% 31%)", x: 112, y: -76, r: 13 },
  { clip: "polygon(0 38%, 27% 33%, 33% 65%, 0 70%)", x: -136, y: -6, r: -17 },
  { clip: "polygon(27% 33%, 58% 30%, 63% 62%, 33% 65%)", x: -38, y: 18, r: 10 },
  { clip: "polygon(58% 30%, 100% 34%, 100% 64%, 63% 62%)", x: 138, y: -8, r: 17 },
  { clip: "polygon(0 69%, 33% 64%, 29% 100%, 0 100%)", x: -116, y: 82, r: 14 },
  { clip: "polygon(33% 64%, 63% 61%, 68% 100%, 29% 100%)", x: 16, y: 108, r: -9 },
  { clip: "polygon(63% 61%, 100% 63%, 100% 100%, 68% 100%)", x: 124, y: 80, r: -15 },
];

function DeviceArtwork({ slide, decorative = false }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Image
        src={slide.imageSrc}
        alt={decorative ? "" : `${slide.title} device preview`}
        width={1672}
        height={941}
        sizes="(max-width: 1024px) 100vw, 58vw"
        loading="lazy"
        decoding="async"
        className="block h-auto w-[118%] max-w-[900px] object-contain [filter:brightness(1.04)_contrast(1.08)_saturate(1.1)]"
        draggable={false}
      />
    </div>
  );
}

function ArrivalCard({ slide, progress, index, reduceMotion }) {
  const starts = [0.01, 0.035, 0.06];
  const settledY = [-24, 8, 40][index];
  const convergeX = [310, 0, -310][index];
  const rotateEnd = [-4, 1, 5][index];
  const y = useTransform(progress, [starts[index], starts[index] + 0.085, 0.205, 0.285], reduceMotion ? [0, 0, 0, 0] : [-560, settledY, settledY, 92]);
  const x = useTransform(progress, [0.17, 0.255], reduceMotion ? [0, 0] : [0, convergeX]);
  const rotate = useTransform(progress, [starts[index], starts[index] + 0.085, 0.255], reduceMotion ? [0, 0, 0] : [rotateEnd * 2, rotateEnd, 0]);
  const scale = useTransform(progress, [0.18, 0.275], [1, 0.78]);
  const opacity = useTransform(progress, [starts[index], starts[index] + 0.025, 0.255, 0.305], [0, 1, 1, 0]);

  return (
    <motion.article
      style={{ x, y, rotate, scale, opacity }}
      className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#090b0d]/90 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl will-change-transform"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black/80">
        <Image
          src={slide.imageSrc}
          alt=""
          width={1672}
          height={941}
          sizes="(max-width: 640px) 100vw, 33vw"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <div className="mt-3 flex items-center gap-3 px-1 pb-1">
        <span className="font-serif-premium text-lg text-white/30">0{index + 1}</span>
        <span className="h-px w-6 bg-white/15" />
        <p className="text-xs font-medium text-white/80">{slide.shortTitle}</p>
      </div>
    </motion.article>
  );
}

function SlideComposition({ slide, index, decorative = false, active = false }) {
  return (
    <div className="grid h-full w-full grid-cols-1 items-center gap-5 py-10 sm:gap-8 lg:grid-cols-12 lg:gap-16 lg:py-0">
      <div className="flex flex-col justify-center lg:col-span-5">
        <div className="mb-6 flex items-center gap-3 text-[11px] tracking-[0.12em] text-white/45">
          <span className="font-serif-premium text-base tracking-normal text-white/70">0{index + 1}</span>
          <span className="h-px w-8 bg-white/20" />
          <span className="uppercase">{slide.tag}</span>
        </div>
        <h3 className="font-serif-premium text-3xl font-normal leading-[1.06] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.35rem]">
          {slide.title}
        </h3>
        <p className="mt-6 max-w-md text-sm font-normal leading-7 text-white/48 sm:text-base">
          {slide.desc}
        </p>
        <ul className="mt-7 space-y-3">
          {slide.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/68">
              <CheckCircle2 className="h-[18px] w-[18px] shrink-0" style={{ color: slide.lineColor }} strokeWidth={1.8} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className={`mt-8 ${active ? "pointer-events-auto" : "pointer-events-none"}`}>
          {decorative ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80">
              View Live Demo
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Link
              href={`/demo/${slide.id}`}
              tabIndex={active ? 0 : -1}
              aria-label={`View the ${slide.title} live demo`}
              className="relative z-30 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.08]"
            >
              View Live Demo
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative h-[245px] min-h-0 sm:h-[370px] lg:col-span-7 lg:h-[540px]">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
          style={{ backgroundColor: slide.glowColor }}
        />
        <DeviceArtwork slide={slide} decorative={decorative} />
      </div>
    </div>
  );
}

function SolidPage({ slide, index, progress, range, active }) {
  const opacity = useTransform(progress, range, [0, 1, 1, range[3] === 1 ? 1 : 0]);
  const scale = useTransform(progress, range, [0.975, 1, 1, range[3] === 1 ? 1 : 0.99]);

  return (
    <motion.article
      aria-hidden={!active}
      style={{ opacity, scale }}
      className={`absolute inset-0 ${active ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <SlideComposition slide={slide} index={index} active={active} />
    </motion.article>
  );
}

function GlassShard({ slide, index, progress, start, end, shard }) {
  const x = useTransform(progress, [start, end], [0, shard.x]);
  const y = useTransform(progress, [start, end], [0, shard.y]);
  const rotate = useTransform(progress, [start, end], [0, shard.r]);
  const scale = useTransform(progress, [start, end], [1, 0.94]);
  const opacity = useTransform(progress, [start, end - 0.018, end], [1, 0.82, 0]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ x, y, rotate, scale, opacity, clipPath: shard.clip, WebkitClipPath: shard.clip }}
      className="pointer-events-none absolute inset-0 select-none will-change-transform"
    >
      <SlideComposition slide={slide} index={index} decorative />
    </motion.div>
  );
}

function GlassTransition({ slide, index, progress, start, end, reduceMotion }) {
  const opacity = useTransform(progress, [start - 0.008, start, end], [0, 1, 1]);
  const fallbackOpacity = useTransform(progress, [start - 0.008, start, end], [0, 1, 0]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ opacity: fallbackOpacity }}
        className={`pointer-events-none absolute inset-0 ${reduceMotion ? "block" : "lg:hidden"}`}
      >
        <SlideComposition slide={slide} index={index} decorative />
      </motion.div>
      {!reduceMotion && (
        <motion.div aria-hidden="true" style={{ opacity }} className="pointer-events-none absolute inset-0 hidden [contain:paint] lg:block">
          {SHARDS.map((shard) => (
            <GlassShard key={shard.clip} slide={slide} index={index} progress={progress} start={start} end={end} shard={shard} />
          ))}
        </motion.div>
      )}
    </>
  );
}

function MobileShowcase() {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  const goTo = (i) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = (e) => {
    const t = e.currentTarget;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    setIndex((cur) => (cur === i ? cur : i));
  };

  const arrow = "grid h-11 w-11 place-items-center border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-cyan-400/50 hover:bg-white/[0.09] disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="relative px-5 py-16 sm:px-10 sm:py-20 lg:hidden">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs tracking-[0.14em] text-cyan-300/75">Made for every screen</p>
        <h2 className="font-serif-premium text-4xl font-normal tracking-tight text-white sm:text-5xl">Your split, wherever you are.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">Three focused experiences. One continuously synced group ledger.</p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl" role="region" aria-roledescription="carousel" aria-label="Device experiences">
        {/* slides: swipe or use the buttons */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SLIDES.map((slide, i) => (
            <article
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              className="w-full shrink-0 snap-center border border-white/10 bg-[#07090b]"
            >
              <div className="relative aspect-[16/10] bg-black/70">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/15 blur-[70px]" />
                <Image
                  src={slide.imageSrc}
                  alt={`${slide.title} device preview`}
                  width={1672}
                  height={941}
                  sizes="(max-width: 672px) 100vw, 640px"
                  loading="lazy"
                  decoding="async"
                  className="relative h-full w-full object-contain"
                  draggable={false}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-[11px] tracking-[0.12em] text-white/45">
                  <span className="font-serif-premium text-base tracking-normal text-cyan-300/80">0{i + 1}</span>
                  <span className="h-px w-8 bg-white/20" />
                  <span className="uppercase">{slide.tag}</span>
                </div>
                <h3 className="font-serif-premium mt-4 text-2xl font-normal leading-tight text-white sm:text-3xl">{slide.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{slide.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {slide.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-white/70">
                      <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-cyan-400" strokeWidth={1.8} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/demo/${slide.id}`}
                  aria-label={`View the ${slide.title} live demo`}
                  className="mt-6 inline-flex items-center gap-2 border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.09]"
                >
                  View Live Demo
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* controls */}
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous slide" className={arrow}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2" aria-hidden="true">
            {SLIDES.map((slide, i) => (
              <span key={slide.id} className={`h-1 transition-all duration-300 ${i === index ? "w-8 bg-cyan-400" : "w-4 bg-white/20"}`} />
            ))}
          </div>
          <button type="button" onClick={() => goTo(index + 1)} disabled={index === SLIDES.length - 1} aria-label="Next slide" className={arrow}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeviceSlideShowcase() {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [transitionIndex, setTransitionIndex] = useState(-1);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  // Never begin on an empty black frame. The introduction is already visible
  // at the section boundary, while the falling cards provide the motion.
  const introOpacity = useTransform(scrollYProgress, [0, 0.225, 0.3], [1, 1, 0]);
  const mainOpacity = useTransform(scrollYProgress, [0.225, 0.28], [0, 1]);

  // State is used only for semantics/focus management. Visual motion remains
  // continuously scroll-linked, so reverse scrolling still rebuilds exactly.
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextIndex = latest < 0.23 ? -1 : latest < 0.545 ? 0 : latest < 0.785 ? 1 : 2;
    const nextTransition = latest >= 0.475 && latest <= 0.605 ? 0 : latest >= 0.715 && latest <= 0.845 ? 1 : -1;
    setActiveIndex((current) => current === nextIndex ? current : nextIndex);
    setTransitionIndex((current) => current === nextTransition ? current : nextTransition);
  });

  return (
    <section ref={containerRef} id="device-slide-showcase" className="relative z-20 bg-[#030303] text-white lg:h-[560vh]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.06),transparent_58%)]" />
      </div>

      <div className="sticky top-0 z-10 hidden h-[100svh] w-full items-center overflow-hidden px-5 sm:px-10 md:px-16 lg:flex lg:px-24">
        <motion.div style={{ opacity: introOpacity }} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-5 sm:px-10 md:px-16">
          <div className="w-full max-w-6xl">
            <div className="mb-9 text-center sm:mb-12">
              <p className="mb-3 text-xs tracking-[0.14em] text-cyan-300/75">Made for every screen</p>
              <h2 className="font-serif-premium text-4xl font-normal tracking-tight text-white sm:text-5xl md:text-6xl">Your split, wherever you are.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">Three focused experiences. One continuously synced group ledger.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
              {SLIDES.map((slide, index) => (
                <ArrivalCard key={slide.id} slide={slide} progress={scrollYProgress} index={index} reduceMotion={reduceMotion} />
              ))}
            </div>
            <p className="mt-9 text-center text-xs text-white/28">Keep scrolling — the three views come together</p>
          </div>
        </motion.div>

        <motion.div style={{ opacity: mainOpacity }} className="relative z-10 mx-auto h-[92svh] w-full max-w-6xl lg:h-[min(720px,88svh)]">
          <div className="absolute inset-0 overflow-visible [contain:paint]">
            <SolidPage slide={SLIDES[0]} index={0} progress={scrollYProgress} range={[0.23, 0.28, 0.49, 0.505]} active={activeIndex === 0} />
            {transitionIndex === 0 && (
              <GlassTransition slide={SLIDES[0]} index={0} progress={scrollYProgress} start={0.495} end={0.585} reduceMotion={reduceMotion} />
            )}

            <SolidPage slide={SLIDES[1]} index={1} progress={scrollYProgress} range={[0.545, 0.6, 0.73, 0.745]} active={activeIndex === 1} />
            {transitionIndex === 1 && (
              <GlassTransition slide={SLIDES[1]} index={1} progress={scrollYProgress} start={0.735} end={0.825} reduceMotion={reduceMotion} />
            )}

            <SolidPage slide={SLIDES[2]} index={2} progress={scrollYProgress} range={[0.785, 0.84, 0.96, 1]} active={activeIndex === 2} />
          </div>
        </motion.div>
      </div>

      {/* Phones and tablets: a plain stacked layout, no scroll animation. */}
      <MobileShowcase />
    </section>
  );
}
