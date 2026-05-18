"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Star, Shield, Smartphone } from "lucide-react";

const PERKS = [
  { icon: Zap, text: "Free forever plan" },
  { icon: Shield, text: "No credit card needed" },
  { icon: Smartphone, text: "Web, iOS & Android" },
  { icon: Star, text: "4.9★ rated by users" },
];

export default function CTASection() {
  const router = useRouter();

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-background">

      {/* Soft ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl text-center"
          style={{
            background: "linear-gradient(135deg, #1e1040 0%, #160d36 40%, #1a0a3d 70%, #0f0a2e 100%)",
            border: "1px solid rgba(139,92,246,0.25)",
            boxShadow:
              "0 0 0 1px rgba(139,92,246,0.1), 0 40px 80px -20px rgba(139,92,246,0.3), 0 0 120px rgba(99,102,241,0.15)",
          }}
        >
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, #a78bfa 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Glowing orbs inside card */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />

          {/* Top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

          <div className="relative z-10 px-8 md:px-20 py-16 md:py-20">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-7"
              style={{
                background: "rgba(139,92,246,0.2)",
                border: "1px solid rgba(139,92,246,0.4)",
                color: "#c4b5fd",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              2,000+ groups already splitting smarter
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-5"
            >
              Stop doing the{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #f472b6 100%)",
                }}
              >
                mental math.
              </span>
            </motion.h2>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.28 }}
              className="text-base md:text-lg text-white/45 max-w-xl mx-auto leading-relaxed mb-10 font-medium"
            >
              SplitEase handles every bill, every trip, every dinner — so you
              never have to awkwardly bring up who owes what again.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
            >
              <button
                onClick={() => router.push("/register")}
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  boxShadow: "0 0 40px rgba(139,92,246,0.5), 0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                <Zap className="w-4 h-4" />
                Create Free Account
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white/70 text-base transition-all hover:scale-105 active:scale-95 hover:text-white"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Sign in instead
              </button>
            </motion.div>

            {/* Perks row */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-white/35 font-medium">
                  <Icon className="w-3.5 h-3.5 text-violet-400/70" />
                  {text}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
