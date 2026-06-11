"use client";

import { Crown, Gem } from "lucide-react";

/* Status badge pinned on the avatar, driven purely by coin balance.
   Below 800 coins nothing renders, so regular users see no change.
   Position it from the caller via className (e.g. "-top-1 -right-1"). */

const TIERS = [
  {
    min: 1500,
    label: "Elite Club",
    Icon: Gem,
    gradient: "from-fuchsia-500 via-purple-500 to-cyan-400",
    glow: "shadow-[0_0_10px_rgba(217,70,239,0.65)]",
  },
  {
    min: 800,
    label: "Gold member",
    Icon: Crown,
    gradient: "from-amber-300 via-amber-400 to-yellow-600",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.6)]",
  },
];

export default function CoinBadge({ coins, size = "sm", className = "" }) {
  const tier = TIERS.find((t) => (coins ?? 0) >= t.min);
  if (!tier) return null;

  const box = size === "lg" ? "w-7 h-7" : "w-[18px] h-[18px]";
  const icon = size === "lg" ? 14 : 10;

  return (
    <span
      title={`${tier.label} · ${coins} coins`}
      className={`absolute z-10 flex items-center justify-center rounded-full bg-gradient-to-br ${tier.gradient} ${tier.glow} ring-2 ring-background ${box} ${className}`}
    >
      <tier.Icon size={icon} className="text-white drop-shadow" strokeWidth={2.5} />
    </span>
  );
}
