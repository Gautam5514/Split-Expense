"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Users,
  Plus,
  Wallet,
  Loader2,
  Sparkles,
  CheckCircle,
  Trash2,
} from "lucide-react";
import InviteModal from "@/components/InviteModal";

export default function DashboardPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("active");
  const [createdGroups, setCreatedGroups] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchGroups();
  }, [token]);

  const fetchGroups = () => {
    api
      .get("/groups")
      .then((res) => {
        const allGroups = res.data || [];
        setGroups(allGroups);
        categorizeGroups(allGroups);
      })
      .catch(() => toast.error("Failed to fetch groups"))
      .finally(() => setLoading(false));
  };

  const categorizeGroups = (groups) => {
    if (!token) return;
    try {
      const userId = JSON.parse(atob(token.split(".")[1])).id;

      const created = groups.filter(
        (g) => g.createdBy === userId || g.createdBy?._id === userId
      );

      const joined = groups.filter((g) => {
        const isMember = g.members?.some((m) => m._id === userId);
        const isCreator = g.createdBy === userId || g.createdBy?._id === userId;
        return isMember && !isCreator;
      });

      setCreatedGroups(created);
      setJoinedGroups(joined);
    } catch (err) {
      setCreatedGroups(groups);
      setJoinedGroups([]);
    }
  };

  const markCompleted = async (groupId) => {
    try {
      await api.put(
        `/groups/${groupId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Marked as completed!");
      fetchGroups();
    } catch (err) {
      toast.error("Failed to mark as completed");
    }
  };

  const deleteTrip = async (groupId) => {
    const confirmed = window.confirm(
      "Delete this trip and all of its expenses, notes, and group messages?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Trip deleted");
      fetchGroups();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete trip");
    }
  };


  const createGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a group name");
    try {
      setCreating(true);
      const res = await api.post("/groups", { name: name.trim() });
      toast.success("Group created successfully!");
      setInviteGroupId(res.data._id);

      fetchGroups();
      setName("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error creating group");
    } finally {
      setCreating(false);
    }
  };

  const activeCreatedGroups = groups.filter(
    (g) => g.status === "active" && !g.isCompleted
  );
  const activeJoinedGroups = groups.filter(
    (g) => g.status === "inactive" && !g.isCompleted
  );
  const completedGroups = groups.filter((g) => g.isCompleted);

  const hasActiveGroups =
    activeCreatedGroups.length > 0 || activeJoinedGroups.length > 0;
  const hasCompletedGroups = completedGroups.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* 🧭 Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-extrabold flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-indigo-500/20 shadow-md flex-shrink-0">
                <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
              </div>
              SplitEase
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your trips, groups & expenses effortlessly
            </p>
          </div>

          {/* 👇 Create Group Input */}
          <form
            onSubmit={createGroup}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              placeholder="Enter new group name"
              className="flex-grow rounded-lg bg-card text-foreground border border-border p-2 px-3 shadow-sm focus:ring-2 focus:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Plus size={18} />
              )}
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        {/* Tabs - Active / Completed */}
        {!loading && groups.length > 0 && (
          <div className="flex justify-center sm:justify-end gap-3 mt-4">
            <button
              onClick={() => setView("active")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition border ${view === "active"
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card border-border text-muted-foreground hover:text-primary"
                }`}
            >
              Active Trips
            </button>

            <button
              onClick={() => setView("completed")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition border ${view === "completed"
                  ? "bg-purple-600 text-white border-transparent"
                  : "bg-card border-border text-muted-foreground hover:text-purple-600"
                }`}
            >
              Completed Trips
            </button>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary w-6 h-6" />
          </div>
        )}

        {/* 🚀 No Groups (Onboarding Card) */}
        {!loading && groups.length === 0 && (
          <div className="bg-card border border-border rounded p-10 text-center shadow-lg">
            <Users className="mx-auto mb-4 text-primary" size={38} />
            <h2 className="text-xl font-semibold mb-2 text-primary">
              No groups yet
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first group above and start splitting expenses.
            </p>
            <p className="text-muted-foreground/60 text-xs italic">
              “Good trips become great when expenses stay fair.”
            </p>
          </div>
        )}

        {/* Active Trips View */}
        {!loading && view === "active" && (
          <div className="space-y-10">
            {/* Your Groups */}
            {activeCreatedGroups.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 text-primary">
                  Your Groups
                </h2>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCreatedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      onMarkCompleted={markCompleted}
                      onDeleteTrip={deleteTrip}
                      isCreator
                      view="active"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Joined Groups */}
            {activeJoinedGroups.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 text-purple-600">
                  Groups You’re Added To
                </h2>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-center text-muted-foreground py-10">
                <p>No active trips found.</p>
              </div>
            )}
          </div>
        )}

        {/* Completed Trips */}
        {!loading && view === "completed" && (
          <section>
            {hasCompletedGroups ? (
              <>
                <h2 className="text-xl font-bold mb-4 text-purple-600">
                  Completed Trips
                </h2>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      isCreator={createdGroups.some((cg) => cg._id === g._id)}
                      onDeleteTrip={deleteTrip}
                      view="completed"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>No completed trips yet.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Invite Modal */}
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

/* 🟩 Group Card Design (Premium Fintech UI) */
function GroupCard({
  group,
  isCreator = false,
  view = "active",
  onMarkCompleted,
  onDeleteTrip,
}) {
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onMarkCompleted(group._id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onDeleteTrip?.(group._id);
  };

  return (
    <Link
      href={`/groups/${group._id}`}
      className="group relative bg-card border border-border hover:shadow-md rounded p-5 transition-all duration-300  flex flex-col justify-between hover:border-primary/50"
    >
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {group.name}
          </h3>

          <Wallet
            size={20}
            className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
          />
        </div>

        {group.members?.length > 0 ? (
          <div className="mt-3.5 flex items-center gap-2">
            <div className="flex -space-x-2.5 overflow-hidden">
              {group.members.slice(0, 4).map((m, i) => {
                const nameStr = m.name || m.email || "User";
                const initial = nameStr.charAt(0).toUpperCase();
                const colors = [
                  "from-violet-500 to-indigo-500",
                  "from-emerald-500 to-teal-500",
                  "from-rose-500 to-pink-500",
                  "from-amber-500 to-orange-500",
                  "from-cyan-500 to-blue-500",
                ];
                const colorBg = colors[i % colors.length];

                return m.photoURL ? (
                  <img
                    key={m._id || i}
                    className="inline-block h-7 w-7 rounded-full ring-2 ring-card object-cover"
                    src={m.photoURL}
                    alt={nameStr}
                    title={nameStr}
                  />
                ) : (
                  <div
                    key={m._id || i}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-card bg-gradient-to-br ${colorBg} text-[10px] font-bold text-white uppercase shadow-sm`}
                    title={nameStr}
                  >
                    {initial}
                  </div>
                );
              })}
              {group.members.length > 4 && (
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[10px] font-bold text-muted-foreground border border-border">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
            
            <span className="text-[11px] text-muted-foreground/75 font-semibold">
              {group.members.length} Member{group.members.length !== 1 && "s"}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 mt-3 italic">No members added yet</p>
        )}
      </div>

      <div className="mt-4">
        {/* Mark Completed */}
        {isCreator && view === "active" && (
          <div
            onClick={handleCheckboxClick}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-muted w-full"
          >
            <input
              type="checkbox"
              id={`completed-${group._id}`}
              checked={group.isCompleted}
              readOnly
              className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
            />
            <label
              htmlFor={`completed-${group._id}`}
              className="text-sm cursor-pointer text-foreground flex items-center gap-1"
            >
              <CheckCircle size={14} className="text-primary" />
              Mark as Completed
            </label>
          </div>
        )}

        {/* Completed Label */}
        {view === "completed" && (
          <div className="text-primary flex items-center gap-1 text-sm font-medium">
            <CheckCircle size={16} /> Trip Completed
          </div>
        )}

        {isCreator && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 size={15} />
            Delete Trip
          </button>
        )}
      </div>
    </Link>
  );
}
