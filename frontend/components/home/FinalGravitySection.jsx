"use client";

import dynamic from "next/dynamic";

const LunarGravityCard = dynamic(() => import("@/components/ui/lunar-gravity-card"), {
  ssr: false,
  loading: () => <div className="h-[580px] w-full max-w-[1120px] animate-pulse rounded-[2rem] border border-white/[0.07] bg-white/[0.025]" />,
});

export default function FinalGravitySection() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-20 text-white sm:px-8 sm:py-28" aria-label="Bring shared expenses into balance">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.055] blur-[140px]" />
      <div className="relative mx-auto flex max-w-7xl justify-center">
        <LunarGravityCard />
      </div>
    </section>
  );
}
