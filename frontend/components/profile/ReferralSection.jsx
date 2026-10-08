"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { playCoinEarn } from "@/lib/coinSound";
import {
  Coins, Copy, Share2, Gift, Users, Trophy, CheckCircle2,
  Clock, Check, Loader2, Sparkles, AlertCircle, MessageCircle,
} from "lucide-react";

/* Eased count-up for the wallet balance - rolls from the previous value to
   the new one like a real wallet app instead of snapping. */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return; // value already settled there
    fromRef.current = target;
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  qualified: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  rewarded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS = {
  pending: "Pending",
  qualified: "Qualified",
  rewarded: "Rewarded",
  cancelled: "Cancelled",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status === "rewarded" && <CheckCircle2 size={11} />}
      {status === "pending" && <Clock size={11} />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ProgressItem({ label, current, required }) {
  const done = current >= required;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
      {done && <CheckCircle2 size={10} />}
      {label}: {Math.min(current, required)}/{required}
    </span>
  );
}

export default function ReferralSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(null); // "code" | "link" | null
  // Hook must run unconditionally (before the loading/error returns).
  const animatedCoins = useCountUp(data?.coins ?? 0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await api.get("/referrals/me");
      setData(res.data);
      if (typeof window !== "undefined" && res.data?.referralCode) {
        setReferralLink(`${window.location.origin}/invite/${res.data.referralCode}`);
      }

      // Coin chime when the balance grew since the user last saw it.
      const newBalance = res.data?.coins ?? 0;
      const lastSeen = Number(localStorage.getItem("se_last_coins"));
      if (!Number.isNaN(lastSeen) && newBalance > lastSeen) {
        playCoinEarn();
        toast.success(`+${newBalance - lastSeen} coins earned!`);
      }
      localStorage.setItem("se_last_coins", String(newBalance));
    } catch (err) {
      setError(true);
      setErrorStatus(err?.response?.status ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = async (text, label, key) => {
    try {
      await navigator.clipboard.writeText(text);
      if (key) {
        setCopied(key);
        setTimeout(() => setCopied(null), 1800);
      }
      toast.success(`${label} copied!`);
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
  };

  const shareMessage =
    "Split expenses with friends, hassle-free. Join me on SplitEase and we both earn coins instantly!";

  const shareWhatsApp = () => {
    if (!referralLink) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on SplitEase",
          text: "Split expenses with friends, hassle-free. Join using my referral link!",
          url: referralLink,
        });
      } catch {
        // user cancelled share - no-op
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 border-y border-border py-5">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-16 w-full bg-muted rounded-lg" />
        <div className="h-10 w-full bg-muted rounded-lg" />
        <div className="h-10 w-full bg-muted rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-2 border-y border-border py-8 text-center">
        <AlertCircle size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your referral details{errorStatus ? ` (error ${errorStatus})` : ""}.
        </p>
        {errorStatus === 404 && (
          <p className="text-xs text-muted-foreground/80">
            The server doesn&apos;t have the referrals feature yet - redeploy the backend.
          </p>
        )}
        <button
          onClick={fetchData}
          className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  const { referralCode, coins, totalEarned, successfulReferrals, invited, eliteClub } = data;
  // Tier progress runs on lifetime-earned coins (basisCoins), not the spendable
  // balance - store purchases can never pull a badge or this bar backwards.
  const tierBasis = eliteClub.basisCoins ?? coins;
  const tierProgressPct = eliteClub.nextTier
    ? Math.min(100, Math.round((tierBasis / eliteClub.nextTier.minCoins) * 100))
    : 100;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">03 / Earn together</p>
        <div className="mt-1 flex items-center gap-2">
          <Gift size={17} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-2xl font-black tracking-[-0.035em] text-foreground">Rewards</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* Left column: wallet + invite */}
        <div className="space-y-5">
          {/* Premium coin wallet */}
          <div className="coin-shine relative overflow-hidden rounded-[1.5rem] border border-cyan-400/20 bg-[linear-gradient(135deg,#061f27_0%,#083344_48%,#155e75_100%)] px-5 py-6 shadow-[0_22px_60px_-35px_rgba(6,182,212,0.85)] sm:px-7 sm:py-7">
            {/* Glow accents */}
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/65">
                  Coin balance
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-black leading-none text-white tabular-nums sm:text-[2.9rem]">
                    {animatedCoins}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-100/55">coins</span>
                </div>
              </div>

              {/* Coin stack - a pile, not one flat icon */}
              <div className="relative h-20 w-24 shrink-0 sm:h-24 sm:w-28">
                {/* back coin */}
                <div className="absolute right-0 top-2 h-11 w-11 -rotate-[18deg] rounded-full border-2 border-amber-200/35 bg-gradient-to-br from-amber-400 to-yellow-700 shadow-md sm:h-12 sm:w-12">
                  <div className="absolute inset-1 rounded-full border border-amber-900/15" />
                </div>
                {/* middle coin */}
                <div className="absolute right-5 top-0 h-12 w-12 rotate-[10deg] rounded-full border-2 border-amber-100/45 bg-gradient-to-br from-amber-300 to-amber-600 shadow-md sm:h-14 sm:w-14">
                  <div className="absolute inset-1 rounded-full border border-amber-900/15" />
                </div>
                {/* front coin - the one that's alive */}
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-0 left-0 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-100/70 bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 shadow-[0_10px_28px_-4px_rgba(245,158,11,0.55)] sm:h-[4.5rem] sm:w-[4.5rem]"
                >
                  <div className="absolute inset-1.5 rounded-full border border-amber-900/20" />
                  <Coins size={28} className="relative text-amber-900 drop-shadow" />
                  <Sparkles size={13} className="absolute -top-1.5 -right-1 text-amber-100 drop-shadow" />
                </motion.div>
              </div>
            </div>

            {/* Stat row - fills the card width instead of one line of prose */}
            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
              <div>
                <p className="text-lg font-black leading-none text-white tabular-nums sm:text-xl">{totalEarned}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/55">Lifetime</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none text-white tabular-nums sm:text-xl">{successfulReferrals}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/55">Referral{successfulReferrals === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="shrink-0 text-amber-300" />
                <p className="text-[11px] font-bold leading-tight text-amber-200/85">{eliteClub.tier.name}</p>
              </div>
            </div>
          </div>

          {/* Invite card: referral code + share, combined */}
          <div className="rounded-[1.5rem] border border-border bg-muted/20 p-5 sm:p-6">
            <div className="rounded-[1.1rem] border border-dashed border-cyan-500/35 bg-cyan-500/[0.045] px-3 py-5 text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
                Your referral code
              </p>
              <button
                type="button"
                onClick={() => copyToClipboard(referralCode, "Referral code", "code")}
                className="group mt-1.5 inline-flex items-center gap-2.5 cursor-pointer"
                title="Tap to copy"
              >
                <span className="font-mono text-[clamp(1.25rem,7vw,1.875rem)] font-black tracking-[0.18em] text-foreground sm:tracking-[0.26em]">
                  {referralCode}
                </span>
                {copied === "code" ? (
                  <Check size={16} className="text-emerald-500" strokeWidth={3} />
                ) : (
                  <Copy size={15} className="text-muted-foreground group-hover:text-cyan-500 transition" />
                )}
              </button>
              <p className="text-[11px] text-muted-foreground mt-1">
                {copied === "code" ? "Copied to clipboard!" : "Tap the code to copy"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                onClick={shareWhatsApp}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-2 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1fb957]"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button
                onClick={() => copyToClipboard(referralLink, "Referral link", "link")}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                {copied === "link" ? (
                  <><Check size={14} className="text-emerald-500" strokeWidth={3} /> Copied</>
                ) : (
                  <><Copy size={14} /> Copy link</>
                )}
              </button>
              <button
                onClick={shareLink}
                className="col-span-2 flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-cyan-700 px-2 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-800 sm:col-span-1"
              >
                <Share2 size={14} /> Share
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              The moment a friend joins with your link, you both earn coins instantly.
            </p>
          </div>
        </div>

        {/* Right column: status + network */}
        <div className="space-y-5">
          {/* Elite Club */}
          <section className="space-y-4 rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h2 className="text-base font-black text-foreground">Elite Club</h2>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-foreground">{eliteClub.tier.name}</span>
              </div>
              {eliteClub.nextTier && (
                <span className="text-xs text-muted-foreground">
                  {eliteClub.coinsToNext} coins to {eliteClub.nextTier.name}
                </span>
              )}
            </div>

            {eliteClub.nextTier && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {eliteClub.tier.perks.map((perk) => (
                <span key={perk} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {perk}
                </span>
              ))}
            </div>
          </section>

          {/* Invited friends */}
          <section className="space-y-3 rounded-2xl border border-border bg-muted/25 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">Network</span>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-base font-black text-foreground">Invited Friends</h2>
              </div>
            </div>

            {invited.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
                  <Gift size={24} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-sm font-semibold text-foreground">You haven&apos;t invited anyone yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Share your referral link with friends - you&apos;ll both earn coins instantly when they join SplitEase.
                </p>
                <button
                  onClick={shareLink}
                  className="mt-1 flex items-center gap-1.5 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-800"
                >
                  <Share2 size={13} /> Share your link
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {invited.map((ref) => (
                  <li key={ref.id} className="py-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                      {ref.friend?.photoURL ? (
                        <img src={ref.friend.photoURL} alt={ref.friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={16} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{ref.friend?.name || "Unknown user"}</p>
                        <StatusBadge status={ref.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Joined {ref.friend?.joinedAt ? new Date(ref.friend.joinedAt).toLocaleDateString() : "-"}
                      </p>
                      {ref.status === "pending" && ref.progress && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <ProgressItem label="Active days" current={ref.progress.activeDays.current} required={ref.progress.activeDays.required} />
                          <ProgressItem label="Expenses" current={ref.progress.expenses.current} required={ref.progress.expenses.required} />
                          {ref.progress.profileComplete !== undefined && (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${ref.progress.profileComplete ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                              {ref.progress.profileComplete && <CheckCircle2 size={10} />}
                              Profile {ref.progress.profileComplete ? "complete" : "incomplete"}
                            </span>
                          )}
                        </div>
                      )}
                      {ref.status === "rewarded" && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          +{ref.referrerRewardAmount} coins earned
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
