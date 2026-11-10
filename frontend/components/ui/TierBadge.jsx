import { Award, Crown, Gem } from "lucide-react";

/* Elite Club tier badge shown next to a person's name. Takes the tier key the
   API returns (`eliteTier` on /users/me and on group members, or
   `eliteClub.tier.key` on /referrals/me). Starter - and anything unknown -
   renders nothing, so it is safe to drop next to any name.

   variant "soft"  - tinted pill for normal app surfaces (light and dark).
   variant "solid" - filled pill for coloured or photo backgrounds, where a
                     tint would not stay legible. */

const TIERS = {
  bronze: {
    label: "Bronze",
    Icon: Award,
    soft: "border-orange-600/25 bg-orange-600/10 text-orange-800 dark:text-orange-300",
    solid: "border-orange-900/20 bg-orange-700 text-white",
  },
  silver: {
    label: "Silver",
    Icon: Award,
    soft: "border-slate-400/40 bg-slate-400/15 text-slate-600 dark:text-slate-300",
    solid: "border-slate-400/40 bg-slate-200 text-slate-800",
  },
  gold: {
    label: "Gold",
    Icon: Crown,
    soft: "border-amber-500/30 bg-amber-400/15 text-amber-700 dark:text-amber-300",
    solid: "border-amber-600/30 bg-amber-400 text-amber-950",
  },
  elite: {
    label: "Elite",
    Icon: Gem,
    soft: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    solid: "border-violet-900/20 bg-violet-600 text-white",
  },
};

export function TierBadge({ tier, variant = "soft", className = "" }) {
  const config = TIERS[String(tier || "").toLowerCase()];
  if (!config) return null;
  const { label, Icon } = config;

  return (
    <span
      title={`${label} member`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase leading-none tracking-wide ${
        variant === "solid" ? config.solid : config.soft
      } ${className}`}
    >
      <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

export default TierBadge;
