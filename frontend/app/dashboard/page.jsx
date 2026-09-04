"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Plus,
  Loader2,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  CheckCircle,
} from "lucide-react";
import InviteModal from "@/components/InviteModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

export default function DashboardPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("active");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  useEffect(() => {
    if (!token) return;
    fetchGroups();
  }, [token]);

  const fetchGroups = () => {
    api
      .get("/groups")
      .then((res) => {
        setGroups(res.data || []);
      })
      .catch(() => toast.error("Failed to fetch groups"))
      .finally(() => setLoading(false));
  };


  const markCompleted = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put(`/groups/${groupId}/complete`, {});
      toast.success("Marked as completed!");
      fetchGroups();
    } catch {
      toast.error("Failed to mark as completed");
    }
  };

  const confirmDeleteTrip = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/groups/${deleteTarget.id}`);
      toast.success("Trip deleted");
      fetchGroups();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete trip");
    } finally {
      setDeleteTarget(null);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Group name is required."); return; }
    if (trimmed.length < 2) { setNameError("Must be at least 2 characters."); return; }
    if (trimmed.length > 100) { setNameError("Must be under 100 characters."); return; }
    setNameError("");
    try {
      setCreating(true);
      const res = await api.post("/groups", { name: trimmed });
      toast.success("Group created successfully!");
      setInviteGroupId(res.data._id);
      fetchGroups();
      setName("");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field === "name") setNameError(data.message);
      else toast.error(data?.message || "Error creating group");
    } finally {
      setCreating(false);
    }
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
    <div className="min-h-screen bg-background text-foreground pt-8 pb-32 sm:pb-12 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">Groups</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your trips, groups &amp; expenses effortlessly.
            </p>
          </div>

          <form onSubmit={createGroup} className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-2">
              <input
                placeholder="Enter new group name"
                className={`flex-grow rounded-xl bg-card text-foreground border p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  nameError ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
              />
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 shrink-0"
              >
                {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus size={16} />}
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
            {nameError && <p className="text-destructive text-xs mt-0.5">{nameError}</p>}
          </form>
        </div>

        {/* Underline Tabs */}
        {!loading && groups.length > 0 && (
          <div className="flex items-center gap-4 sm:gap-6 border-b border-border">
            <button
              onClick={() => setView("active")}
              className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                view === "active"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Trips
            </button>
            <button
              onClick={() => setView("completed")}
              className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                view === "completed"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed Trips
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
          <div className="bg-card border border-border rounded-xl p-8 sm:p-12 text-center shadow-sm">
            <Users className="mx-auto mb-4 text-primary" size={36} />
            <h2 className="text-lg font-semibold text-foreground mb-1">No groups yet</h2>
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
                    <GroupCard
                      key={g._id}
                      group={g}
                      isCreator
                      view="active"
                      onMarkCompleted={markCompleted}
                      onDeleteTrip={(e, id, name) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id, name }); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {activeJoinedGroups.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-primary mb-4">Groups You&apos;re Added To</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeJoinedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      isCreator={false}
                      view="active"
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasActiveGroups && groups.length > 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No active trips found.</p>
            )}
          </div>
        )}

        {/* Completed Trips */}
        {!loading && view === "completed" && (
          <section>
            {completedGroups.length > 0 ? (
              <>
                <h2 className="text-base font-bold text-primary mb-4">Completed Trips</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {completedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      isCreator={g.status === "active"}
                      onDeleteTrip={(e, id, name) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id, name }); }}
                      view="completed"
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No completed trips yet.</p>
            )}
          </section>
        )}
      </div>

      {inviteGroupId && (
        <InviteModal
          groupId={inviteGroupId}
          token={token}
          onClose={() => setInviteGroupId(null)}
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTrip}
        title={`Delete "${deleteTarget?.name}"?`}
        description="You're about to permanently delete this trip. All expenses, notes, group messages, and member data will be removed forever."
      />
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

function GroupCard({ group, isCreator = false, view = "active", onMarkCompleted, onDeleteTrip }) {
  const hasActions = isCreator && (view === "active" || view === "completed");
  const isSettled = view === "completed";

  return (
    <Link
      href={`/groups/${group._id}`}
      className={`group relative flex flex-col bg-card border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
        isSettled
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : "border-border hover:border-primary/30"
      }`}
    >
      {isSettled && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={12} />
          Settled
        </span>
      )}

      {/* Card body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isSettled ? "bg-emerald-500/10" : "bg-primary/10"
            }`}
          >
            {isSettled ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="min-w-0 pt-0.5 pr-16">
            <h3 className="font-bold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {group.name}
            </h3>
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

      {/* Footer actions */}
      {hasActions && (
        <div
          className={`border-t px-5 py-3 flex items-center justify-between ${
            isSettled ? "border-emerald-500/20 bg-emerald-500/5" : "border-border"
          }`}
          onClick={(e) => e.preventDefault()}
        >
          {view === "active" ? (
            <>
              <button
                type="button"
                onClick={(e) => onMarkCompleted(e, group._id)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCircle2 size={15} />
                Mark as Completed
              </button>
              <button
                type="button"
                onClick={(e) => onDeleteTrip(e, group._id, group.name)}
                className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={15} />
                Trip Completed &amp; Settled
              </div>
              <button
                type="button"
                onClick={(e) => onDeleteTrip(e, group._id, group.name)}
                className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </Link>
  );
}
