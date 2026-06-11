"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import {
  Coins, Copy, Share2, Gift, Users, Trophy, CheckCircle2,
  Clock, Loader2, Sparkles, AlertCircle,
} from "lucide-react";

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
  const [referralLink, setReferralLink] = useState("");

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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
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
        <p className="text-sm text-muted-foreground">Couldn't load your referral details.</p>
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
  const tierProgressPct = eliteClub.nextTier
    ? Math.min(100, Math.round((coins / eliteClub.nextTier.minCoins) * 100))
    : 100;

  return (
    <div className="space-y-4">

      {/* Coin balance + referral code/link */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-foreground">Referrals &amp; Rewards</h2>
        </div>

        {/* Coin balance */}
        <div className="flex items-center justify-between rounded-2xl p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Coins size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Coin Balance</p>
              <p className="text-2xl font-extrabold text-foreground leading-tight">{coins}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium">Total earned</p>
            <p className="text-sm font-bold text-foreground">{totalEarned} coins</p>
            <p className="text-[11px] text-muted-foreground">{successfulReferrals} successful referral{successfulReferrals === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Referral code */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Your referral code</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 text-sm font-mono font-bold tracking-widest text-foreground bg-muted/60 border border-border rounded-lg">
              {referralCode}
            </div>
            <button
              onClick={() => copyToClipboard(referralCode, "Referral code")}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition cursor-pointer"
            >
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>

        {/* Referral link */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Your referral link</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 text-xs sm:text-sm text-foreground bg-muted/60 border border-border rounded-lg truncate">
              {referralLink}
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, "Referral link")}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition cursor-pointer"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={shareLink}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg transition cursor-pointer"
            >
              <Share2 size={13} /> Share
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Share this link - when a friend joins and gets active, you both earn coins.
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
            <p className="text-sm font-semibold text-foreground">You haven't invited anyone yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Share your referral link with friends - you'll both earn coins once they get active on SplitEase.
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
