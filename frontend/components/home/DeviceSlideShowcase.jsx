"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Laptop, Tablet, Smartphone, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DeviceSlideShowcase() {
  const containerRef = useRef(null);

  // Hook scroll progress to our 300vh scroll-track container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      if (latest < 0.33) {
        setActiveIndex(0);
      } else if (latest >= 0.33 && latest < 0.66) {
        setActiveIndex(1);
      } else {
        setActiveIndex(2);
      }
    });
  }, [scrollYProgress]);

  const slides = [
    {
      id: "laptop",
      tag: "DESKTOP WEBAPP",
      title: "Widescreen Command Center",
      desc: "Manage your group trips, calculate complex split percentages, and track overall spending profiles on a unified, gorgeous desktop interface built for power users.",
      icon: Laptop,
      imageSrc: "/laptop.webp",
      color: "from-cyan-500 to-blue-500",
      accent: "text-cyan-400",
      accentBg: "bg-cyan-500/10",
      glowColor: "rgba(45, 212, 191, 0.18)",
      features: [
        "Full screen overview of split ledgers",
        "Detailed graphical expense analytics",
        "Multi-group dashboard view"
      ]
    },
    {
      id: "tablet",
      tag: "TABLET EXPERIENCE",
      title: "Lounge & Audit Comfort",
      desc: "Review room audits and examine receipt details on a highly responsive tablet canvas. Settle balances from a couch, a hammock, or anywhere you unwind.",
      icon: Tablet,
      imageSrc: "/tablet.webp",
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-400",
      accentBg: "bg-emerald-500/10",
      glowColor: "rgba(45, 212, 191, 0.18)",
      features: [
        "Interactive room balance visualizers",
        "Pinch-to-zoom scanned receipt viewer",
        "Quick swipe navigation between screens"
      ]
    },
    {
      id: "mobile",
      tag: "MOBILE COMPANION",
      title: "Split on the Go",
      desc: "Log cost splits in seconds directly from the taxi, ticket line, or restaurant. Scan bills with offline AI OCR and clear pending debts with one-tap UPI settlements.",
      icon: Smartphone,
      imageSrc: "/mobile.webp",
      color: "from-pink-500 to-purple-500",
      accent: "text-pink-400",
      accentBg: "bg-pink-500/10",
      glowColor: "rgba(56, 189, 248, 0.18)",
      features: [
        "Instant camera OCR receipt scanning",
        "Tap-to-settle UPI & QR integration",
        "Offline-first logging & automatic syncing"
      ]
    },
  ];

  // Sliding animation variants for AnimatePresence
  // entering from the left (-150%) and exiting to the right (150%)
  const slideVariants = {
    enter: {
      x: "-120%",
      opacity: 0,
      scale: 0.9,
    },
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 220, damping: 24 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
      },
    },
    exit: {
      x: "120%",
      opacity: 0,
      scale: 0.9,
      transition: {
        x: { type: "spring", stiffness: 220, damping: 24 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
      },
    },
  };

  return (
    <section
      ref={containerRef}
      id="device-slide-showcase"
      className="relative h-[300vh] bg-[#030303] text-white z-20"
    >
      {/* Background graphic nodes */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-900/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
      </div>

      {/* Sticky screen container */}
      <div className="sticky top-0 h-[100svh] w-full flex items-center overflow-hidden z-10 px-6 sm:px-12 md:px-16 lg:px-24">
        
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-6 sm:gap-12 lg:gap-16 relative z-10">
          
          {/* LEFT COLUMN: Features details (Width: 5 cols) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col justify-center text-left relative min-h-[230px] sm:min-h-[400px]">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: -30, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 30, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] border px-2.5 py-1 rounded-md ${slides[activeIndex].accent} border-white/5 bg-white/[0.02] inline-flex items-center gap-1.5`}>
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {slides[activeIndex].tag}
                  </span>
                </div>

                <h3 className="font-serif-premium font-normal text-white text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.1]">
                  {slides[activeIndex].title}
                </h3>

                <p className="text-white/50 text-xs sm:text-sm md:text-base leading-relaxed font-medium max-w-md mt-2">
                  {slides[activeIndex].desc}
                </p>

                {/* Feature Bullet Points */}
                <ul className="mt-2 space-y-2.5">
                  {slides[activeIndex].features.map((feature, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + 0.1 }}
                      className="flex items-start gap-2 text-xs sm:text-sm text-white/70"
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${slides[activeIndex].accent}`} />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-4">
                  <Link
                    href={`/demo/${slides[activeIndex].id}`}
                    className={`px-5 py-2.5 rounded-full text-xs font-semibold text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center gap-2 shadow-lg cursor-pointer inline-flex`}
                  >
                    View Live Demo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

          </div>

          {/* RIGHT COLUMN: Slide-out device container (Width: 7 cols) */}
          <div className="col-span-1 lg:col-span-7 flex justify-center items-center h-[240px] sm:h-[420px] lg:h-full relative">
            
            {/* Visual glow frame element underneath mockups */}
            <div
              className="absolute w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full blur-3xl transition-colors duration-500 pointer-events-none"
              style={{
                backgroundColor: slides[activeIndex].glowColor,
                filter: "blur(100px)",
                opacity: 0.65,
              }}
            />

            {/* Slides container wrapper */}
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              
              <AnimatePresence mode="popLayout" custom={1}>
                <motion.div
                  key={activeIndex}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute w-full h-full flex items-center justify-center select-none"
                >
                  {/* Laptop rendering */}
                  {activeIndex === 0 && (
                    <div className="w-[105%] sm:w-[110%] md:w-[118%] lg:w-[128%] max-w-[900px] drop-shadow-[0_30px_70px_rgba(0,0,0,0.9)]">
                      <img
                        src="/laptop.webp"
                        className="w-full h-auto object-contain block [filter:brightness(1.03)_contrast(1.08)_saturate(1.12)] [mask-image:radial-gradient(ellipse_70%_68%_at_center,#000_35%,rgba(0,0,0,0.4)_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_70%_68%_at_center,#000_35%,rgba(0,0,0,0.4)_70%,transparent_100%)]"
                        alt="Laptop Dashboard Layout"
                      />
                    </div>
                  )}

                  {/* Tablet rendering */}
                  {activeIndex === 1 && (
                    <div className="w-[82%] sm:w-[82%] md:w-[85%] max-w-[560px] drop-shadow-[0_30px_70px_rgba(0,0,0,0.9)]">
                      <img
                        src="/tablet.webp"
                        className="w-full h-auto object-contain block [filter:brightness(1.03)_contrast(1.08)_saturate(1.12)] [mask-image:radial-gradient(ellipse_72%_70%_at_center,#000_35%,rgba(0,0,0,0.4)_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_72%_70%_at_center,#000_35%,rgba(0,0,0,0.4)_70%,transparent_100%)]"
                        alt="Tablet Lounge Audit"
                      />
                    </div>
                  )}

                  {/* Mobile rendering */}
                  {activeIndex === 2 && (
                    <div className="w-[88%] sm:w-[78%] md:w-[74%] max-w-[500px] drop-shadow-[0_30px_70px_rgba(0,0,0,0.9)]">
                      <img
                        src="/mobile.webp"
                        className="w-full h-auto object-contain block [filter:brightness(1.03)_contrast(1.08)_saturate(1.12)] [mask-image:radial-gradient(ellipse_74%_72%_at_center,#000_38%,rgba(0,0,0,0.4)_72%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_74%_72%_at_center,#000_38%,rgba(0,0,0,0.4)_72%,transparent_100%)]"
                        alt="Mobile Companion App"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
