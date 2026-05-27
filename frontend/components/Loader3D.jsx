"use client";

import { useEffect, useState } from "react";
import { Compass, Home, Coins, Users, Receipt, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_MESSAGES = [
  "Packing the travel suitcases...",
  "Splitting roommate utility bills...",
  "Plotting the joint trip route...",
  "Summing up group expenses...",
  "Consulting SplitEase AI budget copilot...",
  "Checking roommate rental shares...",
  "Settling trip debt balances..."
];

export default function Loader3D({ message }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] w-full p-4 relative overflow-hidden select-none bg-background">
      {/* 🔮 Radiant glowing ambient backdrop blur */}
      <div className="absolute w-60 h-60 bg-gradient-to-tr from-cyan-500/10 via-transparent to-amber-500/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      
      {/* 🎨 Main 3D Viewport container */}
      <div className="perspective-1000 flex items-center justify-center h-48 w-full">
        {/* 📦 Spinning 3D Cube */}
        <div className="relative w-20 h-20 animate-spin-3d preserve-3d">
          
          {/* Face 1: Front (Traveler Compass) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-cyan-500/30 dark:border-cyan-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "translateZ(40px)" }}
          >
            <Compass className="text-cyan-500 dark:text-cyan-400 w-8 h-8 animate-pulse" />
          </div>

          {/* Face 2: Back (Roommate Home) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "rotateY(180deg) translateZ(40px)" }}
          >
            <Home className="text-emerald-500 dark:text-emerald-400 w-8 h-8 animate-pulse" />
          </div>

          {/* Face 3: Left (Budgets Coins) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-amber-500/30 dark:border-amber-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "rotateY(-90deg) translateZ(40px)" }}
          >
            <Coins className="text-amber-500 dark:text-amber-400 w-8 h-8 animate-pulse" />
          </div>

          {/* Face 4: Right (Family/Friends Users) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-sky-500/30 dark:border-sky-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "rotateY(90deg) translateZ(40px)" }}
          >
            <Users className="text-sky-500 dark:text-sky-400 w-8 h-8 animate-pulse" />
          </div>

          {/* Face 5: Top (Expenses Receipt) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-pink-500/30 dark:border-pink-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "rotateX(90deg) translateZ(40px)" }}
          >
            <Receipt className="text-pink-500 dark:text-pink-400 w-8 h-8 animate-pulse" />
          </div>

          {/* Face 6: Bottom (SplitEase AI Copilot) */}
          <div 
            className="absolute inset-0 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-violet-500/30 dark:border-violet-400/20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ transform: "rotateX(-90deg) translateZ(40px)" }}
          >
            <Sparkles className="text-violet-500 dark:text-violet-400 w-8 h-8 animate-pulse" />
          </div>

        </div>
      </div>

      {/* 📄 Elegant cycling glassmorphic details card */}
      <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-sm w-full text-center space-y-4">
        
        {/* Customized or primary loading message */}
        {message ? (
          <h2 className="text-foreground text-base sm:text-lg font-extrabold tracking-tight">
            {message}
          </h2>
        ) : (
          <h2 className="text-foreground text-base sm:text-lg font-extrabold tracking-tight">
            Syncing SplitEase Workspace
          </h2>
        )}

        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="text-xs sm:text-sm text-muted-foreground font-bold tracking-wide animate-pulse"
            >
              {DEFAULT_MESSAGES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress micro-bar simulation */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-sky-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </div>
  );
}
