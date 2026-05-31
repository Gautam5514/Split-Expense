"use client";

import { useEffect, useState } from "react";
import { Compass, Home, Coins, Users, Receipt, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  { text: "Packing the travel suitcases...", icon: Compass, textColor: "text-cyan-500 dark:text-cyan-400" },
  { text: "Splitting roommate utility bills...", icon: Home, textColor: "text-emerald-500 dark:text-emerald-400" },
  { text: "Plotting the joint trip route...", icon: Compass, textColor: "text-sky-500 dark:text-sky-400" },
  { text: "Summing up group expenses...", icon: Coins, textColor: "text-amber-500 dark:text-amber-400" },
  { text: "Consulting SplitEase AI budget copilot...", icon: Sparkles, textColor: "text-violet-500 dark:text-violet-400" },
  { text: "Checking roommate rental shares...", icon: Users, textColor: "text-pink-500 dark:text-pink-400" },
  { text: "Settling trip debt balances...", icon: Receipt, textColor: "text-indigo-500 dark:text-indigo-400" }
];

// Statically generate particles to keep renders extremely fast and stable
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  x: Math.random() * 80 - 40, // keep within container margins
  y: Math.random() * 80 - 40,
  size: Math.random() * 4 + 2, // 2px to 6px
  duration: Math.random() * 8 + 8, // 8s to 16s
  delay: Math.random() * -10
}));

export default function Loader3D({ message }) {
  const [progress, setProgress] = useState(0);

  // Sync progress value (0 to 100) organically over a beautiful loop of 12.6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0; // loops back smoothly
        }
        // Increment progress by 1 step
        return prev + 1;
      });
    }, 126); // 126ms * 100 = 12.6s total loop

    return () => clearInterval(timer);
  }, []);

  // Compute active step based on progress threshold (14.3% per stage)
  const activeStep = Math.min(Math.floor(progress / 14.3), STAGES.length - 1);
  const activeStage = STAGES[activeStep];
  const messageText = activeStage.text;

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] w-full p-6 relative overflow-hidden select-none bg-background">
      
      {/* 🔮 Rich multi-layered backdrop radial glows */}
      <div className="absolute w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-pink-500/5 to-violet-500/10 rounded-full blur-[100px] pointer-events-none -z-20 animate-pulse" />
      <div className="absolute w-60 h-60 bg-gradient-to-bl from-emerald-500/5 via-transparent to-amber-500/5 rounded-full blur-[80px] pointer-events-none -z-20 animate-pulse" style={{ animationDuration: '6s' }} />

      {/* ✨ Ambient floating star and heart particles field */}
      {PARTICLES.map((p) => {
        const isHeart = p.id % 5 === 0;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none -z-10 flex items-center justify-center"
            style={{
              left: `${50 + p.x}%`,
              top: `${50 + p.y}%`,
              width: isHeart ? undefined : p.size,
              height: isHeart ? undefined : p.size,
              background: isHeart ? "transparent" : "radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0) 75%)",
            }}
            animate={{
              x: [0, Math.sin(p.id) * 30, -Math.sin(p.id) * 30, 0],
              y: [0, -35, 35, 0],
              scale: [1, 1.4, 0.8, 1],
              opacity: [0.1, 0.45, 0.1]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay
            }}
          >
            {isHeart && (
              <svg 
                className="w-3.5 h-3.5 text-pink-500/20 fill-pink-500/15 drop-shadow-[0_0_4px_rgba(236,72,153,0.1)]" 
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )}
          </motion.div>
        );
      })}

      {/* 🚀 Extraordinary 3D Kinetic Structure (Orbits & Luminous Core) */}
      <div className="perspective-1000 flex items-center justify-center h-56 w-full relative mb-4">
        
        {/* Outer Orbit Ring 1 (Cyan Axis) */}
        <motion.div
          className="absolute w-48 h-48 rounded-full border border-cyan-500/20 dark:border-cyan-400/10 pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
            boxShadow: "0 0 30px rgba(6,182,212,0.08), inset 0 0 30px rgba(6,182,212,0.08)"
          }}
          animate={{
            rotateX: 70,
            rotateY: [0, 360],
            z: [-8, 8, -8]
          }}
          transition={{
            rotateY: { duration: 12, repeat: Infinity, ease: "linear" },
            z: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
        />

        {/* Outer Orbit Ring 2 (Pink Axis - Counter-rotating) */}
        <motion.div
          className="absolute w-40 h-40 rounded-full border border-pink-500/20 dark:border-pink-400/10 pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
            boxShadow: "0 0 30px rgba(236,72,153,0.08), inset 0 0 30px rgba(236,72,153,0.08)"
          }}
          animate={{
            rotateX: -35,
            rotateY: [360, 0],
            z: [8, -8, 8]
          }}
          transition={{
            rotateY: { duration: 9, repeat: Infinity, ease: "linear" },
            z: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        />

        {/* 3D Floating Glass Portal Core */}
        <motion.div
          className="relative w-24 h-24 preserve-3d"
          animate={{
            rotateY: [0, 360],
            rotateX: [12, -12, 12],
            y: [-6, 6, -6]
          }}
          transition={{
            rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
            rotateX: { duration: 7, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Luminous Core Backdrop Halo */}
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-cyan-500/25 via-pink-500/15 to-violet-500/25 blur-2xl opacity-70" />

          {/* Floating Glassmorphic Center Card */}
          <div className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl border border-white/30 dark:border-white/5 rounded-3xl flex items-center justify-center shadow-2xl preserve-3d">
            
            {/* Pulsing Luminous Rotating Boundary */}
            <motion.div 
              className="absolute w-16 h-16 rounded-full border border-dashed border-cyan-400/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            />

            {/* Dynamic Swapping Core Icon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ scale: 0.4, opacity: 0, rotate: -60 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 60 }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                className="relative z-10"
              >
                {(() => {
                  const ActiveIcon = activeStage.icon;
                  return (
                    <ActiveIcon 
                      className={`w-9 h-9 ${activeStage.textColor} drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]`} 
                    />
                  );
                })()}
              </motion.div>
            </AnimatePresence>
            
          </div>
        </motion.div>
      </div>

      {/* 📄 Elegant cycling glassmorphic details card */}
      <div className="bg-white/40 dark:bg-slate-900/35 backdrop-blur-2xl border border-white/25 dark:border-white/5 rounded-[32px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.4)] max-w-sm w-full text-center space-y-5 relative overflow-hidden">
        
        {/* Glowing top active engine status badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-400/10">
            <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '5s' }} />
            SplitEase AI Engine Active
          </span>
        </div>

        {/* Custom or primary loading message */}
        {message ? (
          <h2 className="text-foreground text-base sm:text-lg font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            {message}
          </h2>
        ) : (
          <h2 className="text-foreground text-base sm:text-lg font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            Syncing SplitEase Workspace
          </h2>
        )}

        {/* Beautiful letters stagger entrance status message */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep}
              className="text-xs sm:text-sm text-muted-foreground font-extrabold tracking-wide flex justify-center items-center select-none"
            >
              {messageText.split("").map((char, idx) => (
                <motion.span
                  key={idx}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -15, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 24,
                    delay: idx * 0.02
                  }}
                  className={char === " " ? "mr-1" : ""}
                >
                  {char}
                </motion.span>
              ))}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress micro-bar simulation container */}
        <div className="space-y-2.5">
          {/* Glowing Digital Percentage Tracker */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              Progress
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              {progress}%
            </span>
          </div>

          {/* Liquid Laser Progress Bar */}
          <div className="w-full h-2.5 bg-muted/50 dark:bg-slate-950/40 rounded-full p-[2px] border border-slate-200/50 dark:border-white/5 shadow-inner relative overflow-hidden">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-sky-500 relative"
              style={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 15 }}
            >
              {/* 🌟 Liquid laser flare head */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_12px_#fff,_0_0_18px_#22d3ee,_0_0_25px_#06b6d4]" />
              
              {/* Flowing liquid shimmer highlight */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
