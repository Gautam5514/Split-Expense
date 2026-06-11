"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Laptop, Compass, Smartphone, ArrowRight } from "lucide-react";

export default function ScrollPinnedShowcase() {
  const containerRef = useRef(null);

  // Hook scroll progress to our 300vh scroll-track container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Track active index based on scroll progress
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

  // Image 3D Parallax Motion Maps for Layered Device Deck
  
  // ── LAPTOP (Device 1)
  const scaleImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [1, 1, 0.82, 0.82]);
  const opacityImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [1, 1, 0.15, 0.15]);
  const rotateXImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [0, 0, -10, -10]);
  const translateZImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [0, 0, -150, -150]);
  const xImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [0, 0, -80, -80]);
  const yImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], [0, 0, -40, -40]);
  const blurImg1 = useTransform(scrollYProgress, [0, 0.22, 0.33, 1], ["blur(0px)", "blur(0px)", "blur(4px)", "blur(4px)"]);

  // ── TABLET (Device 2)
  const scaleImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [0.82, 0.82, 1, 1, 0.82, 0.82]);
  const opacityImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [0.15, 0.15, 1, 1, 0.15, 0.15]);
  const rotateXImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [-10, -10, 0, 0, -10, -10]);
  const translateZImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [-150, -150, 0, 0, -150, -150]);
  const xImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [-80, -80, 0, 0, 80, 80]);
  const yImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], [-40, -40, 0, 0, 40, 40]);
  const blurImg2 = useTransform(scrollYProgress, [0, 0.22, 0.33, 0.55, 0.66, 1], ["blur(4px)", "blur(4px)", "blur(0px)", "blur(0px)", "blur(4px)", "blur(4px)"]);

  // ── MOBILE (Device 3)
  const scaleImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [0.82, 0.82, 1, 1]);
  const opacityImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [0.15, 0.15, 1, 1]);
  const rotateXImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [-10, -10, 0, 0]);
  const translateZImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [-150, -150, 0, 0]);
  const xImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [80, 80, 0, 0]);
  const yImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], [40, 40, 0, 0]);
  const blurImg3 = useTransform(scrollYProgress, [0, 0.55, 0.66, 1], ["blur(4px)", "blur(4px)", "blur(0px)", "blur(0px)"]);

  // Progress Bar Width percentage
  const progressPercent = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const slides = [
    {
      tag: "WORKSPACE PREVIEW",
      title: "Command Center",
      desc: "Manage trips, calculate percentages, and track spending profiles on a unified desktop command layout. Built for serious financial coordination and power users.",
      icon: Laptop,
      color: "from-cyan-500 to-blue-500",
      accent: "text-cyan-400",
    },
    {
      tag: "REAL-TIME LOGGING",
      title: "Detailed Room Audit",
      desc: "Drill down into individual expense rooms, view categorizations, upload invoices, and resolve disputes on a highly interactive, responsive layout.",
      icon: Compass,
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-400",
    },
    {
      tag: "ON THE GO FREEDOM",
      title: "Mobile Interface",
      desc: "Log cost splits in seconds directly from the taxi, ticket line, or restaurant. Access AI receipt scanner offline and settle debts with one-tap optimizations.",
      icon: Smartphone,
      color: "from-pink-500 to-purple-500",
      accent: "text-pink-400",
    },
  ];

  return (
    <section
      ref={containerRef}
      id="axiom-showcase"
      className="relative h-[300vh] bg-[#030303] text-white z-20"
    >
      {/* Background Volcanic Rock Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/showcase-bg.png"
          className="w-full h-full object-cover opacity-25 mix-blend-color-dodge pointer-events-none"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
      </div>

      {/* Pinned Sticky container */}
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden z-10 px-6 sm:px-12 md:px-16">
        
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 items-center gap-10 md:gap-16 relative z-10">
          {/* LEFT: Elegant Descriptive Text Overlays */}
          <div className="col-span-1 md:col-span-5 flex flex-col justify-center text-left relative min-h-[300px] sm:min-h-[350px]">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: -25, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 25, filter: "blur(8px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-white/70">
                    {slides[activeIndex].tag}
                  </span>
                </div>

                <h3 className="font-serif-premium font-normal text-white text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none">
                  {slides[activeIndex].title}
                </h3>

                <p className="text-white/50 text-xs sm:text-sm md:text-base leading-relaxed font-medium max-w-sm mt-2">
                  {slides[activeIndex].desc}
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <button className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#030303] bg-white hover:bg-white/95 hover:scale-102 transition flex items-center gap-2 shadow-lg shadow-white/5 cursor-pointer">
                    Explore Feature
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* GSAP-Style Scrolling Progress Bar */}
            <div className="mt-10 md:mt-12 flex flex-col gap-2.5 max-w-xs">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-white/30">
                <span>PROGRESS</span>
                <span className="text-white/70 font-bold">{`0${activeIndex + 1} / 03`}</span>
              </div>
              
              {/* Track Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                  style={{ width: progressPercent }}
                  className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${slides[activeIndex].color} shadow-[0_0_8px_rgba(255,255,255,0.2)]`}
                />
              </div>

              {/* Step dots */}
              <div className="flex gap-2.5 mt-1">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`w-2.5 h-1 rounded-full transition-all duration-300 ${
                      activeIndex === idx
                        ? `w-6 bg-gradient-to-r ${slides[idx].color}`
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Cinematic 3D Floating Chamber (Device Mockup Stack) */}
          <div className="col-span-1 md:col-span-7 flex justify-center items-center h-full">
            
            <div 
              className="relative w-full aspect-[4/3.5] max-w-[540px] md:max-w-[640px] flex items-center justify-center"
              style={{
                perspective: 1200,
                transformStyle: "preserve-3d",
              }}
            >
              
              {/* DEVICE 1: LAPTOP MOCKUP (Desktop Dashboard) */}
              <motion.div
                style={{
                  scale: scaleImg1,
                  opacity: opacityImg1,
                  rotateX: rotateXImg1,
                  transformStyle: "preserve-3d",
                  z: translateZImg1,
                  x: xImg1,
                  y: yImg1,
                  filter: blurImg1,
                  zIndex: activeIndex === 0 ? 30 : 10,
                }}
                className="absolute w-[400px] sm:w-[500px] md:w-[580px] select-none flex items-center justify-center"
              >
                <img
                  src="/laptop.png"
                  className="w-full h-auto object-contain block drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
                  alt="Laptop Mockup"
                />
              </motion.div>

              {/* DEVICE 2: TABLET MOCKUP (Detailed Room Audit) */}
              <motion.div
                style={{
                  scale: scaleImg2,
                  opacity: opacityImg2,
                  rotateX: rotateXImg2,
                  transformStyle: "preserve-3d",
                  z: translateZImg2,
                  x: xImg2,
                  y: yImg2,
                  filter: blurImg2,
                  zIndex: activeIndex === 1 ? 30 : 20,
                }}
                className="absolute w-[280px] sm:w-[340px] md:w-[400px] select-none flex items-center justify-center"
              >
                <img
                  src="/tablet.png"
                  className="w-full h-auto object-contain block drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
                  alt="Tablet Mockup"
                />
              </motion.div>

              {/* DEVICE 3: MOBILE MOCKUP (Mobile Interface) */}
              <motion.div
                style={{
                  scale: scaleImg3,
                  opacity: opacityImg3,
                  rotateX: rotateXImg3,
                  transformStyle: "preserve-3d",
                  z: translateZImg3,
                  x: xImg3,
                  y: yImg3,
                  filter: blurImg3,
                  zIndex: activeIndex === 2 ? 30 : 10,
                }}
                className="absolute w-[160px] sm:w-[200px] md:w-[240px] select-none flex items-center justify-center"
              >
                <img
                  src="/mobile.png"
                  className="w-full h-auto object-contain block drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
                  alt="Mobile Mockup"
                />
              </motion.div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
