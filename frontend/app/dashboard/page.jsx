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
      console.error("Categorization error:", err);
      // Fallback in case of token parsing error
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
      fetchGroups(); // Refresh the list
    } catch (err) {
      console.error("markCompleted error:", err);
      toast.error("Failed to mark as completed");
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a group name");
    try {
      setCreating(true);
      const res = await api.post("/groups", { name: name.trim() });
      toast.success("Group created successfully!");
      const newGroup = res.data;

      // Immediately show invite modal for this group
      setInviteGroupId(newGroup._id);

      fetchGroups();
      setName("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error creating group");
    } finally {
      setCreating(false);
    }
  };

  // --- UI Rendering Logic ---

  // Pre-filter lists to simplify JSX
  // Pre-filter lists to simplify JSX
  const activeCreatedGroups = groups.filter(
    (g) => g.status === "active" && !g.isCompleted
  );
  const activeJoinedGroups = groups.filter(
    (g) => g.status === "inactive" && !g.isCompleted
  );
  const completedGroups = groups.filter((g) => g.isCompleted);

  // Derived flags for clean conditional rendering
  const hasActiveGroups =
    activeCreatedGroups.length > 0 || activeJoinedGroups.length > 0;
  const hasCompletedGroups = completedGroups.length > 0;

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-black dark:text-white py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* 🧭 Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="text-emerald-400" size={28} /> SplitEase
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Create, manage and split expenses with ease 💸
            </p>
          </div>

          <form
            onSubmit={createGroup}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              placeholder="Enter new group name"
              className="flex-grow sm:flex-grow-0 rounded-lg bg-gray-900 text-gray-200 border border-gray-800 p-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-emerald-600/20 disabled:opacity-60"
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

        {/* Don't show toggles if there are no groups at all */}
        {!loading && groups.length > 0 && (
          <div className="flex justify-center sm:justify-end gap-3 mt-4">
            <button
              onClick={() => setView("active")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === "active"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Active Trips
            </button>
            <button
              onClick={() => setView("completed")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === "completed"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Completed Trips
            </button>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-gray-500 w-6 h-6" />
          </div>
        )}

        {/* 🚀 Onboarding Section */}
        {!loading && groups.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center shadow-xl shadow-emerald-600/10 backdrop-blur-sm">
            <Users className="mx-auto mb-4 text-emerald-400" size={38} />
            <h2 className="text-lg font-semibold text-white mb-2">
              No groups yet
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Create your first group above and start splitting expenses with
              your friends instantly.
            </p>
            <p className="text-gray-500 text-xs italic">
              “Because friendships are easier when money is fair.”
            </p>
          </div>
        )}

        {/* 🟢 Active Trips View */}
        {!loading && view === "active" && (
          <div className="space-y-10">
            {activeCreatedGroups.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 text-emerald-400">
                  Your Groups
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCreatedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      onMarkCompleted={markCompleted}
                      isCreator
                      view="active"
                    />
                  ))}
                </div>
              </section>
            )}

            {activeJoinedGroups.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 text-blue-400">
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
              <div className="text-center text-gray-400 py-10">
                <p>No active trips found.</p>
              </div>
            )}
          </div>
        )}

        {/* 🔵 Completed Trips View */}
        {/* 🔵 Completed Trips View */}
        {!loading && view === "completed" && (
          <section>
            {hasCompletedGroups ? (
              <>
                <h2 className="text-xl font-semibold mb-4 text-indigo-400">
                  Completed Trips
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGroups.map((g) => (
                    <GroupCard
                      key={g._id}
                      group={g}
                      isCreator={createdGroups.some((cg) => cg._id === g._id)}
                      view="completed"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <p>No completed trips yet.</p>
              </div>
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
    </div>
    
  );
}

/* 🧩 Reusable Card Component */
function GroupCard({
  group,
  isCreator = false,
  view = "active",
  onMarkCompleted,
}) {
  const handleCheckboxClick = (e) => {
    // Prevent Link navigation when clicking the checkbox area
    e.stopPropagation();
    e.preventDefault();
    onMarkCompleted(group._id);
  };

  return (
    <Link
      href={`/groups/${group._id}`}
      className="group relative bg-gray-900 border border-gray-800 hover:border-emerald-500 rounded-xl p-5 transition-all duration-300 shadow-md hover:shadow-emerald-500/10 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
            {group.name}
          </h3>
          <Wallet
            size={20}
            className="text-gray-400 group-hover:text-emerald-400 transition-colors flex-shrink-0"
          />
        </div>

        <p className="text-sm text-gray-400 mt-1">
          {group.members?.length || 0} members
        </p>

        {group.members?.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 line-clamp-1">
            {group.members
              .slice(0, 3)
              .map((m) => m.name || m.email)
              .join(", ")}
            {group.members.length > 3 ? "…" : ""}
          </div>
        )}
      </div>

      <div className="mt-4">
        {/* ✅ Mark Completed Checkbox (only for creator and active view) */}
        {isCreator && view === "active" && (
          <div
            onClick={handleCheckboxClick}
            className="flex items-center gap-2 cursor-pointer p-1 -ml-1 rounded-md hover:bg-gray-800 w-full"
          >
            <input
              type="checkbox"
              id={`completed-${group._id}`}
              checked={group.isCompleted}
              readOnly
              className="w-4 h-4 accent-emerald-500 cursor-pointer pointer-events-none"
            />
            <label
              htmlFor={`completed-${group._id}`}
              className="text-sm text-gray-300 cursor-pointer select-none flex items-center gap-1"
            >
              <CheckCircle size={14} className="text-emerald-400" />
              Mark as Completed
            </label>
          </div>
        )}

        {/* 🟢 Show completed label in completed view */}
        {view === "completed" && (
          <div className="text-emerald-400 flex items-center gap-1 text-sm font-medium">
            <CheckCircle size={16} /> Trip Completed
          </div>
        )}
      </div>
    </Link>
    
  );
}
