"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UsersRound, Receipt, MessageSquare, Newspaper, Briefcase,
  Mail, ArrowUpRight, FileText, Inbox, Plus, ExternalLink, Sparkles,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { AnimatedNumber, Card, EmptyState, LoadingBlock, SegmentedBar } from "@/components/admin/AdminUI";

const HERO_CARDS = [
  {
    key: "totalUsers",
    label: "Users onboarded",
    icon: Users,
    glow: "from-cyan-400/25 via-cyan-500/5 to-transparent",
    ring: "ring-cyan-400/25",
    iconTone: "bg-cyan-400/10 text-cyan-300",
  },
  {
    key: "totalGroups",
    label: "Groups created",
    icon: UsersRound,
    glow: "from-violet-400/25 via-violet-500/5 to-transparent",
    ring: "ring-violet-400/25",
    iconTone: "bg-violet-400/10 text-violet-300",
  },
  {
    key: "totalExpenses",
    label: "Expenses logged",
    icon: Receipt,
    glow: "from-emerald-400/25 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-400/25",
    iconTone: "bg-emerald-400/10 text-emerald-300",
  },
];

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const AVATAR_TONES = [
  "from-cyan-400/30 to-cyan-600/10 text-cyan-300",
  "from-violet-400/30 to-violet-600/10 text-violet-300",
  "from-amber-400/30 to-amber-600/10 text-amber-300",
  "from-emerald-400/30 to-emerald-600/10 text-emerald-300",
  "from-pink-400/30 to-pink-600/10 text-pink-300",
];
const avatarTone = (seed = "") => AVATAR_TONES[seed.charCodeAt(0) % AVATAR_TONES.length];

const ActivityRow = ({ name, line, time }) => (
  <div className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-white/[0.02]">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-extrabold ring-1 ring-white/[0.06] ${avatarTone(name)}`}>
      {initials(name)}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[12.5px] font-bold text-white">{name}</p>
      <p className="truncate text-[11.5px] text-white/35">{line}</p>
    </div>
    <span className="shrink-0 text-[10.5px] font-medium text-white/25">{time}</span>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    (async () => {
      try {
        const { data } = await adminApi.get("/admin/stats");
        setStats(data);
      } catch {
        toast.error("Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400/70">{dateLabel}</p>
          <h1 className="font-serif-premium text-[34px] font-normal leading-none tracking-tight text-white sm:text-[38px]">
            {greeting}, Gautam.
          </h1>
          <p className="mt-2.5 text-sm text-white/40">Here&apos;s what&apos;s happening across SplitEase right now.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[11.5px] font-bold text-white/50">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live data
        </span>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          {/* Hero metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            {HERO_CARDS.map((card) => (
              <div key={card.key} className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] p-6 ring-1 ring-inset ${card.ring}`}>
                <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${card.glow} blur-2xl`} />
                <div className="relative">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconTone}`}>
                    <card.icon size={18} strokeWidth={2.2} />
                  </span>
                  <p className="font-serif-premium mt-5 text-[44px] font-normal leading-none tracking-tight text-white">
                    <AnimatedNumber value={stats?.[card.key] ?? 0} />
                  </p>
                  <p className="mt-2 text-[12.5px] font-semibold text-white/40">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: "newMessages", label: "New messages", icon: MessageSquare, tone: "text-amber-300 bg-amber-400/10", href: "/admin/messages" },
              { key: "publishedPosts", label: "Published posts", total: stats?.totalBlogPosts, icon: Newspaper, tone: "text-pink-300 bg-pink-400/10", href: "/admin/blog" },
              { key: "openJobs", label: "Open roles", total: stats?.totalJobs, icon: Briefcase, tone: "text-sky-300 bg-sky-400/10", href: "/admin/careers" },
              { key: "totalApplications", label: "Applications", icon: FileText, tone: "text-violet-300 bg-violet-400/10", href: "/admin/careers/applications" },
            ].map((c) => (
              <Link key={c.key} href={c.href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111114] p-4 transition-colors hover:border-white/[0.16]">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.tone}`}>
                  <c.icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-none tracking-tight text-white">
                    <AnimatedNumber value={stats?.[c.key] ?? 0} />
                    {c.total != null && <span className="text-white/30">/{c.total}</span>}
                  </p>
                  <p className="mt-1 truncate text-[10.5px] font-semibold text-white/35">{c.label}</p>
                </div>
                <ArrowUpRight size={13} className="ml-auto shrink-0 text-white/0 transition-colors group-hover:text-white/25" />
              </Link>
            ))}
          </div>

          {/* Pipeline + quick actions */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0 p-5 sm:p-6">
              <h2 className="text-[13.5px] font-extrabold text-white">Messages pipeline</h2>
              <div className="mt-4">
                <SegmentedBar
                  segments={[
                    { label: "New", value: stats?.messagesByStatus?.new ?? 0, tone: "cyan" },
                    { label: "Read", value: stats?.messagesByStatus?.read ?? 0, tone: "amber" },
                    { label: "Resolved", value: stats?.messagesByStatus?.resolved ?? 0, tone: "emerald" },
                  ]}
                />
              </div>
              <h2 className="mt-6 text-[13.5px] font-extrabold text-white">Applications pipeline</h2>
              <div className="mt-4">
                <SegmentedBar
                  segments={[
                    { label: "New", value: stats?.applicationsByStatus?.new ?? 0, tone: "cyan" },
                    { label: "Reviewed", value: stats?.applicationsByStatus?.reviewed ?? 0, tone: "amber" },
                    { label: "Shortlisted", value: stats?.applicationsByStatus?.shortlisted ?? 0, tone: "violet" },
                    { label: "Hired", value: stats?.applicationsByStatus?.hired ?? 0, tone: "emerald" },
                    { label: "Rejected", value: stats?.applicationsByStatus?.rejected ?? 0, tone: "red" },
                  ]}
                />
              </div>
            </Card>

            <Card className="min-w-0 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-[13.5px] font-extrabold text-white">
                <Sparkles size={14} className="text-cyan-300" />
                Quick actions
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Link href="/admin/blog/new" className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.02]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-400/10 text-pink-300"><Plus size={14} /></span>
                  <span className="text-[12.5px] font-bold text-white">New post</span>
                </Link>
                <Link href="/admin/careers/new" className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.02]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><Plus size={14} /></span>
                  <span className="text-[12.5px] font-bold text-white">New job</span>
                </Link>
                <Link href="/admin/messages" className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.02]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><Inbox size={14} /></span>
                  <span className="text-[12.5px] font-bold text-white">Inbox</span>
                </Link>
                <a href="/" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.02]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><ExternalLink size={14} /></span>
                  <span className="text-[12.5px] font-bold text-white">Live site</span>
                </a>
              </div>
            </Card>
          </div>

          {/* Recent activity */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[13.5px] font-extrabold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/20">
                    <Mail size={13} />
                  </span>
                  Recent messages
                </h2>
                <Link href="/admin/messages" className="flex items-center gap-1 text-[11.5px] font-bold text-white/35 hover:text-white">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="mt-4">
                {stats?.recentMessages?.length ? (
                  <div className="space-y-1">
                    {stats.recentMessages.map((m) => (
                      <ActivityRow key={m._id} name={m.name} line={m.message} time={timeAgo(m.createdAt)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Inbox} title="No messages yet" description="Submissions from the Contact Us page will show up here." />
                )}
              </div>
            </Card>

            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[13.5px] font-extrabold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/20">
                    <FileText size={13} />
                  </span>
                  Recent applications
                </h2>
                <Link href="/admin/careers/applications" className="flex items-center gap-1 text-[11.5px] font-bold text-white/35 hover:text-white">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="mt-4">
                {stats?.recentApplications?.length ? (
                  <div className="space-y-1">
                    {stats.recentApplications.map((a) => (
                      <ActivityRow key={a._id} name={a.name} line={`Applied for ${a.job?.title || "a deleted role"}`} time={timeAgo(a.createdAt)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Briefcase} title="No applications yet" description="Candidates applying through /careers will show up here." />
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
