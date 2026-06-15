"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Mindmap3D from "@/components/demo/Mindmap3D";

export default function DemoPage() {
  // Reset scroll position to top on page mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#000000] text-white overflow-hidden flex items-center justify-center select-none font-sans">
      {/* Background abstract grid details with very low opacity to feel premium */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-950/5 rounded-full blur-[160px]" />
      </div>

      {/* The pure full-screen dynamic 3D mindmap visualizer */}
      <div className="w-full h-full relative z-10">
        <Mindmap3D />
      </div>
    </div>
  );
}

