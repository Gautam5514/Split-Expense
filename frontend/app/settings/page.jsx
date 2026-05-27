"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import toast from "@/lib/toast";
import {
  Settings, ShieldCheck, Download, Trash2, KeyRound,
  Wrench, AlertTriangle, ChevronDown, Check, Loader2, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Loader3D from "@/components/Loader3D";

const CURRENCIES = [
  { value: "USD", label: "🇺🇸 USD $" },
  { value: "INR", label: "🇮🇳 INR ₹" },
  { value: "EUR", label: "🇪🇺 EUR €" },
  { value: "GBP", label: "🇬🇧 GBP £" },
  { value: "JPY", label: "🇯🇵 JPY ¥" },
  { value: "AUD", label: "🇦🇺 AUD A$" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { token, setToken } = useAuth();

  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [currency, setCurrency]           = useState("USD");
  const [splitStrategy, setSplitStrategy] = useState("equal");
  const [profileVisible, setProfileVisible] = useState(true);
  const [twoFactor, setTwoFactor]         = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput]         = useState("");
  const [deleting, setDeleting]               = useState(false);

  // Deactivate modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  useEffect(() => {
    setCurrency(localStorage.getItem("settings_currency") || "USD");
    setSplitStrategy(localStorage.getItem("settings_split") || "equal");
    setProfileVisible(localStorage.getItem("settings_visibility") !== "false");
    setTwoFactor(localStorage.getItem("settings_2fa") === "true");
    if (token) fetchProfile();
    else setLoading(false);
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const saveCurrency = (val) => {
    setCurrency(val);
    localStorage.setItem("settings_currency", val);
    toast.success(`Currency set to ${val}`);
  };

  const saveStrategy = (val) => {
    setSplitStrategy(val);
    localStorage.setItem("settings_split", val);
  };

  const toggleVisibility = () => {
    const next = !profileVisible;
    setProfileVisible(next);
    localStorage.setItem("settings_visibility", next ? "true" : "false");
    toast.success(`Profile visibility ${next ? "enabled" : "disabled"}`);
  };

  const toggleTwoFactor = () => {
    const next = !twoFactor;
    setTwoFactor(next);
    localStorage.setItem("settings_2fa", next ? "true" : "false");
    toast.success(`Two-Factor Authentication ${next ? "enabled" : "disabled"}`);
  };

  const handlePasswordReset = async () => {
    const email = profile?.email || auth.currentUser?.email;
    if (!email) return toast.error("No email found.");
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Reset link sent to ${email}`);
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  const handleExportData = async () => {
    const id = toast.loading("Preparing export…");
    try {
      const [profileRes, groupsRes] = await Promise.all([
        api.get("/profile").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] })),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { name: profileRes.data?.name, email: profileRes.data?.email },
        preferences: { currency, splitStrategy, profileVisible, twoFactor },
        groups: groupsRes.data || [],
      };
      const a = document.createElement("a");
      a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      a.download = `SplitEase_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success("Data exported!", { id });
    } catch {
      toast.error("Export failed", { id });
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success("Cache cleared. Reloading…");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      await api.delete("/profile/account");
      await signOut(auth);
      setToken(null);
      localStorage.clear();
      toast.success("Account permanently deleted.");
      router.replace("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader3D message="Syncing workspace preferences..." />;
  }

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
        </div>

        {/* ── System Preferences ── */}
        <SettingsCard icon={<Settings size={16} className="text-slate-500" />} title="System Preferences">
          <SettingsRow label="Default Currency">
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => saveCurrency(e.target.value)}
                className="appearance-none bg-muted border border-border rounded pl-3 pr-8 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </SettingsRow>

          <SettingsRow label="Split Strategy">
            <div className="flex rounded overflow-hidden border border-border bg-muted text-xs font-semibold">
              {[
                { val: "equal", label: "Equal Split" },
                { val: "ratio", label: "Ratio Split" },
                { val: "exact", label: "Exact Amounts" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => saveStrategy(opt.val)}
                  className={`px-3 py-2 transition cursor-pointer ${
                    splitStrategy === opt.val
                      ? "bg-cyan-600 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label="Profile Visibility">
            <Toggle on={profileVisible} onToggle={toggleVisibility} />
          </SettingsRow>
        </SettingsCard>

        {/* ── Security ── */}
        <SettingsCard icon={<ShieldCheck size={16} className="text-slate-500" />} title="Security">
          <SettingsRow label="Password">
            <OutlineButton onClick={handlePasswordReset}>
              Reset Password
            </OutlineButton>
          </SettingsRow>

          <SettingsRow label="Two-Factor Authentication">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${twoFactor ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {twoFactor ? "Enabled" : "Disabled"}
              </span>
              <Toggle on={twoFactor} onToggle={toggleTwoFactor} />
            </div>
          </SettingsRow>
        </SettingsCard>

        {/* ── Workspace Diagnostics ── */}
        <SettingsCard icon={<Wrench size={16} className="text-slate-500" />} title="Workspace Diagnostics">
          <SettingsRow label="Export My Data">
            <OutlineButton onClick={handleExportData} icon={<Download size={13} />}>
              Export as JSON
            </OutlineButton>
          </SettingsRow>

          <SettingsRow label="Clear Cache">
            <OutlineButton onClick={handleClearCache} icon={<Trash2 size={13} />}>
              Clear App Cache
            </OutlineButton>
          </SettingsRow>
        </SettingsCard>

        {/* ── Account Safety ── */}
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <h2 className="text-base font-bold text-orange-500">Account Safety</h2>
          </div>
          <p className="px-5 pb-3 text-xs text-muted-foreground border-b border-border">
            These actions are irreversible. Please proceed with caution.
          </p>

          <div className="divide-y divide-border">
            <SettingsRow label="Deactivate Account">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(true)}
                className="px-4 py-2 text-sm font-semibold text-orange-500 border border-orange-300 dark:border-orange-500/40 rounded hover:bg-orange-50 dark:hover:bg-orange-500/10 transition cursor-pointer"
              >
                Deactivate Account
              </button>
            </SettingsRow>

            <SettingsRow label="Delete Account">
              <button
                type="button"
                onClick={() => { setDeleteInput(""); setShowDeleteModal(true); }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded transition cursor-pointer shadow-sm"
              >
                Delete Account Permanently
              </button>
            </SettingsRow>
          </div>
        </div>

      </div>

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-500/10 px-6 py-5 border-b border-red-100 dark:border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Delete Account Permanently</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3.5 space-y-1.5">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">What will be deleted:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
                    <li>Your profile and account details</li>
                    <li>All groups you created and their expenses</li>
                    <li>Your membership from all other groups</li>
                    <li>All messages, notes, and uploaded photos</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE here"
                    autoFocus
                    disabled={deleting}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition disabled:opacity-60"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 py-2.5 text-sm font-semibold border border-border rounded-xl text-muted-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== "DELETE" || deleting}
                    className="flex-1 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    {deleting ? "Deleting…" : "Delete Forever"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deactivate Confirmation Modal ── */}
      <AnimatePresence>
        {showDeactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeactivateModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Deactivate Account?</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Your account will be hidden from searches. You can reactivate at any time by signing in again.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold border border-border rounded-xl text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Account deactivated. You can reactivate by signing in.");
                    setShowDeactivateModal(false);
                  }}
                  className="flex-1 py-2.5 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition cursor-pointer"
                >
                  Deactivate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function SettingsCard({ icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-border">
        {icon}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function OutlineButton({ onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-border rounded text-foreground hover:bg-muted transition cursor-pointer"
    >
      {icon}
      {children}
    </button>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${on ? "bg-cyan-500" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform duration-200 flex items-center justify-center ${on ? "translate-x-5" : "translate-x-0"}`}>
        {on && <Check size={11} className="text-cyan-500" strokeWidth={3} />}
      </span>
    </button>
  );
}
