"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { sendPasswordResetEmail } from "firebase/auth";
import toast from "@/lib/toast";
import { 
  Settings, ArrowLeft, ShieldCheck, Mail, ShieldAlert, Sparkles,
  Download, Trash2, Coins, Split, Eye, KeyRound, Database, RefreshCw, LogOut
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";

export default function SettingsPage() {
  const router = useRouter();
  const { token, setToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preference states (loaded from localStorage or defaults)
  const [currency, setCurrency] = useState("INR");
  const [splitStrategy, setSplitStrategy] = useState("equal");
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  // Sync initial settings
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
    
    // Load local storage preferences
    setCurrency(localStorage.getItem("settings_currency") || "INR");
    setSplitStrategy(localStorage.getItem("settings_split_strategy") || "equal");
    setProfileVisibility(localStorage.getItem("settings_profile_visibility") || "public");
    setTwoFactorAuth(localStorage.getItem("settings_two_factor") === "true");
    setIsDeactivated(localStorage.getItem("settings_account_deactivated") === "true");
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load account profile data");
    } finally {
      setLoading(false);
    }
  };

  // State handlers
  const handleCurrencyChange = (val) => {
    setCurrency(val);
    localStorage.setItem("settings_currency", val);
    toast.success(`Default currency updated to ${val}! 🪙`);
  };

  const handleStrategyChange = (val) => {
    setSplitStrategy(val);
    localStorage.setItem("settings_split_strategy", val);
    toast.success("Default bill split preference updated! 📊");
  };

  const handleVisibilityChange = (val) => {
    setProfileVisibility(val);
    localStorage.setItem("settings_profile_visibility", val);
    toast.success(`Profile visibility set to ${val}! 👁️`);
  };

  const handleTwoFactorToggle = () => {
    const nextVal = !twoFactorAuth;
    setTwoFactorAuth(nextVal);
    localStorage.setItem("settings_two_factor", nextVal ? "true" : "false");
    if (nextVal) {
      toast.success("Two-Factor Authentication simulated successfully! 🔒");
    } else {
      toast.info("Two-Factor Authentication disabled.");
    }
  };

  const handleAccountDeactivate = () => {
    const nextVal = !isDeactivated;
    setIsDeactivated(nextVal);
    localStorage.setItem("settings_account_deactivated", nextVal ? "true" : "false");
    if (nextVal) {
      toast.warning("Your account is now deactivated. Other members will see your status as offline. 💤");
    } else {
      toast.success("Your account is now active again! ✨");
    }
  };

  // Firebase integration for Password Reset
  const handlePasswordReset = async () => {
    const userEmail = profile?.email || auth.currentUser?.email;
    if (!userEmail) {
      toast.error("Unable to find user email address.");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, userEmail);
      toast.success(`A secure password reset link was sent to: ${userEmail} 📧`);
    } catch (err) {
      toast.error(err.message || "Failed to trigger reset email.");
    }
  };

  // Dynamic Workspace Data Export
  const handleExportData = async () => {
    const loadingToast = toast.loading("Preparing your workspace database...");
    try {
      const [profileRes, groupsRes] = await Promise.all([
        api.get("/profile").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] }))
      ]);

      const exportPayload = {
        app: "SplitEase Premium Settings",
        exportTimestamp: new Date().toISOString(),
        user: {
          uid: auth.currentUser?.uid,
          name: profileRes?.data?.name || "User",
          email: profileRes?.data?.email || "No email",
          city: profileRes?.data?.city || "",
          mobile: profileRes?.data?.mobile || ""
        },
        preferences: {
          currency,
          splitStrategy,
          profileVisibility,
          twoFactorAuth
        },
        tripsCount: groupsRes?.data?.length || 0,
        trips: groupsRes?.data || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SplitEase_Export_${new Date().toLocaleDateString().replace(/\//g, "-")}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success("Workspace details exported successfully! 📊", { id: loadingToast });
    } catch (err) {
      toast.error("Failed to prepare database export.", { id: loadingToast });
    }
  };

  // Clear application cache
  const handleClearCache = () => {
    const confirmed = window.confirm("Are you sure you want to clear your local workspace cache? This resets customized theme colors and layout preferences.");
    if (!confirmed) return;

    localStorage.clear();
    toast.success("Cache cleared! Reloading workspace...");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // Permanently delete simulated account handler
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "WARNING: This action is permanent! All your shared expense settlements, active trips, notes, and profile details will be destroyed. Are you absolutely sure?"
    );
    if (!confirmed) return;

    const finalConfirm = window.prompt("Type DELETE to confirm permanent destruction of your account:");
    if (finalConfirm !== "DELETE") {
      toast.info("Deletion canceled.");
      return;
    }

    try {
      localStorage.clear();
      await signOut(auth);
      setToken(null);
      toast.success("Account permanently deleted. Reverting to welcome screen.");
      router.replace("/");
    } catch (err) {
      toast.error("Failed to execute account delete.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground animate-pulse font-medium text-sm">Loading settings panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Navigation Head */}
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>

        {/* Headline */}
        <div className="flex items-start gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/15 shrink-0 shadow-sm">
            <Settings size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
              Customize system preferences, configure settlement automation guidelines, manage security, or export personal workspace data.
            </p>
          </div>
        </div>

        {/* ── Single Large Unified Card Shell ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] shadow-sm p-6 sm:p-10 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* COLUMN 1: Settings & Security */}
            <div className="space-y-8">
              
              {/* SECTION: System Preferences */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <Coins size={18} className="text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">System Preferences</h3>
                </div>

                {/* Currency select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-400 block ml-1">
                    Default Workspace Currency
                  </label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                    >
                      <option value="INR" className="dark:bg-slate-900">INR (₹) Indian Rupee</option>
                      <option value="USD" className="dark:bg-slate-900">USD ($) US Dollar</option>
                      <option value="EUR" className="dark:bg-slate-900">EUR (€) Euro</option>
                      <option value="GBP" className="dark:bg-slate-900">GBP (£) British Pound</option>
                      <option value="JPY" className="dark:bg-slate-900">JPY (¥) Japanese Yen</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                  </div>
                </div>

                {/* Default Split Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-400 block ml-1">
                    Preferred Settle Formula
                  </label>
                  <div className="relative">
                    <select
                      value={splitStrategy}
                      onChange={(e) => handleStrategyChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                    >
                      <option value="equal" className="dark:bg-slate-900">Split Evenly (Default)</option>
                      <option value="ratio" className="dark:bg-slate-900">Settle by Exact Ratio %</option>
                      <option value="exact" className="dark:bg-slate-900">Manual Exact Settlement</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                  </div>
                </div>

                {/* Profile Visibility */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-400 block ml-1">
                    Profile Visibility
                  </label>
                  <div className="relative">
                    <select
                      value={profileVisibility}
                      onChange={(e) => handleVisibilityChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                    >
                      <option value="public" className="dark:bg-slate-900">Public (Visible in group searches)</option>
                      <option value="friends" className="dark:bg-slate-900">Group Members Only</option>
                      <option value="private" className="dark:bg-slate-900">Private (Hidden profile)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                  </div>
                </div>
              </div>

              {/* SECTION: Security & Privacy */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <KeyRound size={18} className="text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Security & Credentials</h3>
                </div>

                {/* Password Reset */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-455 dark:text-slate-400 block ml-1">
                    Manage Login Credentials
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full font-extrabold text-xs text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-sm"
                  >
                    <Mail size={14} className="text-cyan-600 dark:text-cyan-400" />
                    Trigger Password Reset Email
                  </button>
                </div>

                {/* Simulated 2FA Toggle */}
                <div className="flex items-center justify-between p-4.5 border border-slate-100 dark:border-slate-800/50 rounded-[20px] bg-slate-50 dark:bg-slate-800/30">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-slate-805 dark:text-slate-200">Two-Factor Authentication</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Verification code required at next login</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTwoFactorToggle}
                    className={`w-12 h-6.5 rounded-full p-1 transition-all duration-300 relative cursor-pointer shrink-0 ${
                      twoFactorAuth ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span className={`w-4.5 h-4.5 rounded-full bg-white shadow-md block transition-transform duration-300 ${
                      twoFactorAuth ? "translate-x-5.5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

            </div>

            {/* COLUMN 2: Workspace Actions & Account Destruction */}
            <div className="space-y-8">
              
              {/* SECTION: Diagnostics & Data */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <Database size={18} className="text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Workspace Diagnostics</h3>
                </div>

                {/* Export Data Button */}
                <div className="flex items-center justify-between p-4.5 border border-slate-100 dark:border-slate-800/50 rounded-[20px] bg-slate-50 dark:bg-slate-800/25">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Workspace Data</h4>
                    <p className="text-[10px] text-slate-450 leading-relaxed">Save details as structured JSON</p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="p-3 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0 transition-colors cursor-pointer border border-cyan-500/10 shadow-inner"
                  >
                    <Download size={15} />
                  </button>
                </div>

                {/* Clear cache */}
                <div className="flex items-center justify-between p-4.5 border border-slate-100 dark:border-slate-800/50 rounded-[20px] bg-slate-50 dark:bg-slate-800/25">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Clear Workspace Cache</h4>
                    <p className="text-[10px] text-slate-450 leading-relaxed">Reset all customized themes & rules</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="p-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 shrink-0 transition-colors cursor-pointer border border-amber-500/10 shadow-inner"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {/* SECTION: Account Actions */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <ShieldAlert size={18} className="text-rose-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">Account Safety</h3>
                </div>

                {/* Account Deactivate Status */}
                <div className="p-5 border border-amber-500/10 rounded-[20px] bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                      Account Status: 
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        isDeactivated ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500 animate-pulse"
                      }`}>
                        {isDeactivated ? "Deactivated" : "Active"}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs">
                      {isDeactivated 
                        ? "Your account is sleep-mode active. Tap Toggle to wake it." 
                        : "Temporarily pause your online status within rooms."}
                    </p>
                  </div>
                  <button
                    onClick={handleAccountDeactivate}
                    className={`px-5 py-2.5 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 border ${
                      isDeactivated 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm"
                    }`}
                  >
                    {isDeactivated ? "Activate Account" : "Deactivate Status"}
                  </button>
                </div>

                {/* Account Destruction */}
                <div className="p-5 border border-rose-500/20 rounded-[20px] bg-rose-500/5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-rose-500 flex items-center gap-1.5">
                      <Trash2 size={13} />
                      Destroy Workspace Account
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Permanently delete this account. All active settlements, trip transactions, messaging histories, and profile items will be completely destroyed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-full shadow-lg active:scale-95 duration-150 cursor-pointer"
                  >
                    <ShieldAlert size={14} />
                    Permanently Delete Account
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
