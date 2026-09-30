"use client";

import { useEffect, useState, createElement } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Loader2,
  CheckCircle2,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import InviteModal from "@/components/InviteModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import PendingInvitesList from "@/components/invites/PendingInvitesList";
import { getGroupIcon } from "@/lib/groupIcons";

const GROUP_TYPE_LABELS = {
  trip: "Trip",
  roommate: "Roommates",
  business: "Business",
};

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("active");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState(null);

  const fetchGroups = () => {
    api
      .get("/groups")
      .then((res) => {
        setGroups(res.data || []);
      })
      .catch(() => toast.error("Failed to fetch groups"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetchGroups();
  }, [token]);

  // The wizard already handled members + invite link, so go straight in.
  const handleGroupCreated = (created) => {
    fetchGroups();
    router.push(`/groups/${created._id}`);
  };

  // Backend sets status="active" for groups the user created,
  // status="inactive" for groups the user was added to.
  const activeCreatedGroups = groups.filter(
    (g) => g.status === "active" && !g.isCompleted
  );
  const activeJoinedGroups = groups.filter(
    (g) => g.status === "inactive" && !g.isCompleted
  );
  const completedGroups = groups.filter((g) => g.isCompleted);

  const hasActiveGroups = activeCreatedGroups.length > 0 || activeJoinedGroups.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground pt-8 pb-32 sm:pb-12 px-3 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_15%_8%,rgba(6,182,212,.10),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(45,212,191,.08),transparent_28%)]" />
      <div className="relative max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.03em] text-foreground">Groups</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your trips, groups &amp; expenses effortlessly.
            </p>
          </div>

          <div className="relative shrink-0 w-fit rounded-full p-[2px] overflow-hidden">
            <span
              aria-hidden
              className="animate-border-orbit pointer-events-none absolute -inset-[65%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_262deg,rgba(255,255,255,0.95)_300deg,rgba(165,243,252,0.9)_332deg,transparent_360deg)]"
            />
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group relative z-10 flex items-center gap-2.5 rounded-full bg-gradient-to-br from-cyan-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_36px_-14px_rgba(8,145,178,0.65)] transition-all hover:shadow-[0_20px_44px_-12px_rgba(8,145,178,0.8)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/10" />
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Plus size={14} strokeWidth={3} />
              </span>
              <span className="relative">New Group</span>
            </button>
          </div>
        </div>

        {/* Invites waiting for my yes/no */}
        <PendingInvitesList compact onChanged={fetchGroups} />

        {/* Segmented glass tabs */}
        {!loading && groups.length > 0 && (
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted/50 backdrop-blur-sm p-1">
            <button
              onClick={() => setView("active")}
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                view === "active"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Groups
            </button>
            <button
              onClick={() => setView("completed")}
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                view === "completed"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed
            </button>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary w-6 h-6" />
          </div>
        )}

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="rounded-[1.75rem] border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={26} />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">No groups yet</h2>
            <p className="text-muted-foreground text-sm">
              Create your first group above and start splitting expenses.
            </p>
          </div>
        )}

        {/* Active Trips */}
        {!loading && view === "active" && (
          <div className="space-y-8">
            {activeCreatedGroups.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-primary mb-4">Your Groups</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeCreatedGroups.map((g) => (
                    <GroupCard key={g._id} group={g} view="active" />
                  ))}
                </div>
              </section>
            )}

            {activeJoinedGroups.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-primary mb-4">Groups You&apos;re Added To</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeJoinedGroups.map((g) => (
                    <GroupCard key={g._id} group={g} view="active" />
                  ))}
                </div>
              </section>
            )}

            {!hasActiveGroups && groups.length > 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No active groups yet. Create one to get started.</p>
            )}
          </div>
        )}

        {/* Completed Trips */}
        {!loading && view === "completed" && (
          <section>
            {completedGroups.length > 0 ? (
              <>
                <h2 className="text-base font-bold text-primary mb-4">Completed Groups</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {completedGroups.map((g) => (
                    <GroupCard key={g._id} group={g} view="completed" />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No completed groups yet.</p>
            )}
          </section>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
      />

      {inviteGroupId && (
        <InviteModal
          groupId={inviteGroupId}
          token={token}
          onClose={() => setInviteGroupId(null)}
        />
      )}
    </div>
  );
}

const avatarColors = [
  "bg-cyan-500 text-white",
  "bg-teal-500 text-white",
  "bg-emerald-500 text-white",
  "bg-rose-500 text-white",
  "bg-amber-500 text-white",
  "bg-blue-500 text-white",
  "bg-violet-500 text-white",
];

// Deterministic gradient per group id, so the icon tile always matches
// across renders/sessions without needing a stored color field.
const ICON_GRADIENTS = [
  ["#0891B2", "#14b8a6"],
  ["#14b8a6", "#0284C7"],
  ["#0E7490", "#22D3EE"],
  ["#0284C7", "#0891B2"],
  ["#7C3AED", "#0891B2"],
  ["#DB2777", "#7C3AED"],
];

const gradientForGroup = (id) => {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return ICON_GRADIENTS[hash % ICON_GRADIENTS.length];
};

function GroupCard({ group, view = "active" }) {
  const isSettled = view === "completed";
  const GroupIcon = getGroupIcon(group.icon);
  const [gA, gB] = gradientForGroup(group._id);
  const typeLabel = GROUP_TYPE_LABELS[group.groupType];

  return (
    <Link
      href={`/groups/${group._id}`}
      className={`group relative flex flex-col cursor-pointer rounded-[1.4rem] border bg-card/95 backdrop-blur-sm shadow-sm transition-all duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg ${
        isSettled
          ? "border-emerald-500/25 hover:border-emerald-500/45"
          : "border-border hover:border-primary/35"
      }`}
    >
      {isSettled && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={12} />
          Settled
        </span>
      )}

      {/* Hand-drawn arrow that sketches itself on hover: the swoosh draws first, then the head. */}
      <svg
        aria-hidden
        viewBox="0 0 60 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-5 top-1/2 h-14 w-12 -translate-y-1/2 -scale-x-100 text-primary/70"
      >
        <path
          d="M34 6 C22 8 24 20 38 22 C52 24 56 34 40 44 C32 50 22 56 10 62"
          pathLength="1"
          className="[stroke-dasharray:1] [stroke-dashoffset:1] opacity-0 transition-[stroke-dashoffset,opacity] duration-500 ease-out group-hover:opacity-100 group-hover:[stroke-dashoffset:0]"
        />
        <path
          d="M24 62.3 L10 62 L18.1 50.6"
          pathLength="1"
          className="[stroke-dasharray:1] [stroke-dashoffset:1] opacity-0 transition-[stroke-dashoffset,opacity] duration-200 ease-out group-hover:opacity-100 group-hover:[stroke-dashoffset:0] group-hover:delay-[450ms]"
        />
      </svg>

      {/* Card body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm overflow-hidden"
            style={
              isSettled || group.photo?.url
                ? undefined
                : { background: `linear-gradient(135deg, ${gA}, ${gB})` }
            }
          >
            {group.photo?.url && !isSettled ? (
              <Image src={group.photo.url} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
            ) : isSettled ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </span>
            ) : GroupIcon ? (
              createElement(GroupIcon, { className: "w-5 h-5 text-white", strokeWidth: 2.2 })
            ) : (
              <LayoutGrid className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0 pt-0.5 pr-6">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                {group.name}
              </h3>
              {typeLabel && !isSettled && (
                <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {typeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.members?.length || 0} Member{group.members?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Member avatars */}
        {group.members?.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2.5">
              {group.members.slice(0, 3).map((m, i) => {
                const photo = m.photoURL || m.profileImage?.url;
                const label = (m.name || m.email || "?").charAt(0).toUpperCase();
                return photo ? (
                  <Image
                    key={m._id || i}
                    src={photo}
                    alt={m.name || m.email}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full ring-2 ring-card object-cover"
                  />
                ) : (
                  <div
                    key={m._id || i}
                    title={m.name || m.email}
                    className={`w-8 h-8 rounded-full ring-2 ring-card flex items-center justify-center text-[11px] font-bold ${avatarColors[i % avatarColors.length]}`}
                  >
                    {label}
                  </div>
                );
              })}
              {group.members.length > 3 && (
                <div className="w-8 h-8 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                  +{group.members.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {group.members
                .slice(0, 2)
                .map((m) => m.name || m.email)
                .join(", ")}
              {group.members.length > 2 && ` +${group.members.length - 2} more`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
