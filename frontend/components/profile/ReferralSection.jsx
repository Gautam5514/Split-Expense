"use client";

import { useEffect, useRef, useState } from "react";
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status === "rewarded" && <CheckCircle2 size={11} />}
      {status === "pending" && <Clock size={11} />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ProgressItem({ label, current, required }) {
  const done = current >= required;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
  };

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
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-16 w-full bg-muted rounded-lg" />
        <div className="h-10 w-full bg-muted rounded-lg" />
        <div className="h-10 w-full bg-muted rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-2">
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
    <div className="space-y-4">

      {/* Coin wallet + referral code/share */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-foreground">Referrals &amp; Rewards</h2>
        </div>

        {/* Premium coin wallet */}
        <div className="coin-shine relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#1d1709] via-[#231a08] to-[#2e2006] border border-amber-500/30 shadow-[0_18px_40px_-18px_rgba(245,158,11,0.4)]">
          {/* Glow accents */}
          <div className="pointer-events-none absolute -top-14 -right-14 w-44 h-44 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-200/70">
                Coin balance
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl sm:text-[2.6rem] font-extrabold text-amber-50 tabular-nums leading-none">
                  {animatedCoins}
                </span>
                <span className="text-xs font-bold text-amber-200/60 uppercase tracking-wider">coins</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-100/55 font-medium">
                <span>
                  <b className="text-amber-100/90 font-bold">{totalEarned}</b> lifetime earned
                </span>
                <span>
                  <b className="text-amber-100/90 font-bold">{successfulReferrals}</b> successful referral{successfulReferrals === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Gold medallion */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 ring-4 ring-amber-300/20 shadow-[0_0_28px_rgba(245,158,11,0.45)] flex items-center justify-center">
                <Coins size={30} className="text-amber-900 drop-shadow" />
              </div>
              <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-200" />
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200/70">
            <Trophy size={11} />
            {eliteClub.tier.name} member
          </div>
        </div>

        {/* Referral code ticket */}
        <div className="rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/[0.04] px-4 py-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
            Your referral code
          </p>
          <button
            type="button"
            onClick={() => copyToClipboard(referralCode, "Referral code", "code")}
            className="group mt-1.5 inline-flex items-center gap-2.5 cursor-pointer"
            title="Tap to copy"
          >
            <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-[0.28em] text-foreground">
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

        {/* Share actions */}
        <div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1fb957] rounded-xl shadow-sm transition cursor-pointer"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={() => copyToClipboard(referralLink, "Referral link", "link")}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-foreground border border-border rounded-xl hover:bg-muted/60 transition cursor-pointer"
            >
              {copied === "link" ? (
                <><Check size={14} className="text-emerald-500" strokeWidth={3} /> Copied</>
              ) : (
                <><Copy size={14} /> Copy link</>
              )}
            </button>
            <button
              onClick={shareLink}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            The moment a friend joins with your link, you both earn coins instantly.
          </p>
        </div>
      </div>

      {/* Elite Club */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-base font-bold text-foreground">Elite Club</h2>
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
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 rounded-full transition-all"
              style={{ width: `${tierProgressPct}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {eliteClub.tier.perks.map((perk) => (
            <span key={perk} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
              {perk}
            </span>
          ))}
        </div>
      </div>

      {/* Invited friends */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-foreground">Invited Friends</h2>
        </div>

        {invited.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 py-8">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Gift size={24} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">You haven&apos;t invited anyone yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Share your referral link with friends - you&apos;ll both earn coins instantly when they join SplitEase.
            </p>
            <button
              onClick={shareLink}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg transition cursor-pointer"
            >
              <Share2 size={13} /> Share your link
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {invited.map((ref) => (
              <li key={ref.id} className="py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
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
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${ref.progress.profileComplete ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
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
      </div>
    </div>
  );
}
