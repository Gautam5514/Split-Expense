"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  LogOut,
  Moon,
  Sun,
  User,
  ChevronDown,
  Home,
  PlusCircle,
  Split,
  MessageCircle,
  MessageCircleMore,
  Bot,
  Sparkles,
  ReceiptText,
  UsersRound,
  CheckCircle2,
  Clock3,
  BellRing,
  Settings,
  Palette,
  Download,
  HelpCircle,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import useTheme from "@/hooks/useTheme";
import { useNotifications } from "@/context/NotificationContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { api } from "@/lib/api";
import toast from "@/lib/toast";

const NAV_LINKS = [
  { href: "/users", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageCircle, label: "Messages" },
  { href: "/dashboard", icon: PlusCircle, label: "Groups", highlight: true },
  { href: "/groupchat", icon: MessageCircleMore, label: "Chatroom" },
  { href: "/ai", icon: Bot, label: "AI" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, setToken } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, hasUnread, setHasUnread, markAllAsRead, markOneAsRead } =
    useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState(null);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const cleanPath = pathname?.replace(/\/$/, "") || "";
  const isAuthPage =
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/register") ||
    cleanPath.startsWith("/reset-password");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (token) {
      api.get("/profile")
        .then((res) => setProfile(res.data))
        .catch((err) => console.error("Error loading profile:", err));
    } else {
      setProfile(null);
    }
  }, [token]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToken(null);
      localStorage.removeItem("token");
      setDropdownOpen(false);
      router.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isLoggedIn = !!token;

  const getNotificationMeta = (type) => {
    if (type === "expense") {
      return {
        label: "Expense",
        Icon: ReceiptText,
        iconClass: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/15",
      };
    }

    return {
      label: "Group",
      Icon: UsersRound,
      iconClass: "bg-violet-500/10 text-violet-500 ring-violet-500/15",
    };
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        profileRef.current && !profileRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (isAuthPage) return null;

  return (
    <>
      <nav
        className={`fixed top-4 md:top-6 inset-x-4 ${isLoggedIn ? "md:left-[96px] lg:left-[272px]" : ""} mx-auto z-40 transition-all duration-300 rounded-2xl border ${
        scrolled
          ? "bg-background/60 backdrop-blur-2xl border-foreground/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          : "bg-background/30 backdrop-blur-xl border-foreground/5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5">

        {/* ── Logo ── */}
        <Link href="/" className={`flex items-center gap-2 group ${isLoggedIn ? "md:hidden" : ""}`}>
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-200">
            <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500 bg-clip-text text-transparent tracking-tight">
            SplitEase
          </span>
        </Link>

        {/* Placeholder title for desktop to occupy space cleanly (only when logged in) */}
        {isLoggedIn && (
          <div className="hidden md:block font-bold text-sm text-foreground/80 tracking-wide uppercase">
            {pathname === "/users" ? "Overview" : pathname === "/dashboard" ? "Trips & Groups" : pathname === "/chat" || pathname === "/groupchat" ? "Settlement Chat" : pathname === "/ai" ? "AI Spend Assistant" : "Workspace"}
          </div>
        )}

        {/* ── Desktop Nav Search (Mockup) ── */}
        {isLoggedIn ? (
          <div className="hidden md:flex items-center relative w-64 max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-3.5 text-muted-foreground/60 w-3.5 h-3.5" size={14} />
            <input
              type="text"
              placeholder="Search expenses..."
              className="w-full bg-slate-100/30 dark:bg-slate-900/35 text-foreground text-xs rounded-xl pl-9 pr-3 py-2 border border-border/60 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/20 focus:border-primary/20 transition-all font-semibold"
              readOnly
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-foreground/70 hover:text-foreground transition-all hover:bg-foreground/5 shrink-0"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="relative flex items-center gap-1 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg overflow-hidden group transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} />
              <Sparkles className="relative w-3 h-3 hidden sm:inline" />
              <span className="relative">Sign Up</span>
            </Link>
          </div>
        )}

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2">

          {/* Notifications */}
          {isLoggedIn && (
            <div className="relative" ref={notifRef}>
              <button
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
                onClick={() => { setNotifOpen(!notifOpen); setHasUnread(false); }}
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" size={18} />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-4 top-[78px] mx-auto md:absolute md:inset-x-auto md:right-0 md:top-auto mt-3 w-auto md:w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-50 overflow-hidden bg-background/95 backdrop-blur-2xl border border-foreground/10">
                  <div className="relative overflow-hidden border-b border-border px-4 py-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/15">
                          <BellRing size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Notifications</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {notifications.length
                              ? `${notifications.length} recent update${notifications.length === 1 ? "" : "s"}`
                              : "No recent updates"}
                          </p>
                        </div>
                      </div>

                      {notifications.length > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-500 transition hover:bg-violet-500/10 hover:text-violet-400"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-6 py-9 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/15">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        You&apos;re all caught up
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        New trip, group, and expense updates will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="max-h-[360px] overflow-y-auto p-2 custom-scrollbar">
                      {notifications.slice(0, 8).map((n, i) => {
                        const { label, Icon, iconClass } = getNotificationMeta(n.type);

                        return (
                          <li key={n._id || i}>
                            <button
                              type="button"
                              onClick={() => { markOneAsRead(n._id); router.push(n.link || "/dashboard"); setNotifOpen(false); }}
                              className="group flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-foreground/5"
                            >
                              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
                                <Icon size={18} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {label}
                                  </span>
                                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock3 size={12} />
                                    {formatNotificationTime(n.createdAt)}
                                  </span>
                                </div>
                                <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground/85 group-hover:text-foreground">
                                  {n.message}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            {theme === "dark"
              ? <Sun size={16} className="text-amber-400" />
              : <Moon size={16} />}
          </button>

          {/* Profile Menu */}
          {isLoggedIn && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-2xl transition-all duration-200 ${
                  dropdownOpen 
                    ? "bg-violet-500/10 ring-2 ring-violet-500 dark:ring-violet-400/90" 
                    : "hover:bg-foreground/5"
                }`}
              >
                {profile?.avatar || user?.photoURL ? (
                  <img 
                    src={profile?.avatar || user?.photoURL} 
                    className="w-7 h-7 rounded-xl border border-white/10 object-cover shadow-sm" 
                    alt="avatar" 
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                    <User size={13} className="text-white" />
                  </div>
                )}
                <ChevronDown
                  size={12}
                  className={`text-foreground/40 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-3 w-72 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] p-1.5 z-50 overflow-hidden bg-white/95 dark:bg-[#090d16]/95 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-2xl transition-all duration-200 transform origin-top-right animate-in fade-in slide-in-from-top-2"
                >
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                    {profile?.avatar || user?.photoURL ? (
                      <div className="relative group shrink-0">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                        <img 
                          src={profile?.avatar || user?.photoURL} 
                          className="relative w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm" 
                          alt="avatar" 
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-violet-500/20 shadow-sm"
                        style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                        <span className="text-white font-bold text-sm">
                          {(profile?.name || user?.displayName || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">
                        {profile?.name || user?.displayName || "User"}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                        {profile?.email || user?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="space-y-0.5">
                    <DropdownItem
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      icon={<User size={14} />}
                      label="Profile"
                    />
                    <DropdownItem
                      href="/theme"
                      onClick={() => setDropdownOpen(false)}
                      icon={<Palette size={14} />}
                      label="Themes"
                    />
                    <DropdownItem
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      icon={<Settings size={14} />}
                      label="Settings"
                    />
                    <DropdownItem
                      href="/notification"
                      onClick={() => setDropdownOpen(false)}
                      icon={<Bell size={14} />}
                      label="Notification Settings"
                    />
                    <DropdownItem
                      href="/downloadapp"
                      onClick={() => setDropdownOpen(false)}
                      icon={<Download size={14} />}
                      label="Download Apps"
                    />
                    <DropdownItem
                      href="/helps"
                      onClick={() => setDropdownOpen(false)}
                      icon={<HelpCircle size={14} />}
                      label="Help"
                    />

                    <div className="my-1 mx-2 h-px bg-slate-100 dark:bg-slate-800/50" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all hover:translate-x-0.5"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>

    {/* ── Desktop Left Sidebar ── */}
    {isLoggedIn && (
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-20 lg:w-64 border-r border-border bg-card/45 dark:bg-slate-950/45 backdrop-blur-2xl z-40 p-4 transition-all duration-300 flex-shrink-0 justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2 group mt-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="hidden lg:block font-black text-lg bg-gradient-to-r from-violet-500 via-indigo-400 to-fuchsia-450 bg-clip-text text-transparent tracking-tight">
              SplitEase
            </span>
          </Link>

          {/* Sidebar Links */}
          <div className="space-y-1">
            {[
              { href: "/users", icon: Home, label: "Dashboard" },
              { href: "/dashboard", icon: UsersRound, label: "Groups", badge: "3" },
              { href: "/users#spending", icon: ReceiptText, label: "Expenses" },
              { href: "/chat", icon: MessageCircle, label: "Messages", badge: "5" },
              { href: "/ai", icon: Bot, label: "AI Assistant" },
            ].map(({ href, icon: Icon, label, badge }) => {
              const active = label === "Expenses" 
                ? pathname === "/users" && typeof window !== "undefined" && window.location.hash === "#spending"
                : pathname === href || (href === "/chat" && pathname === "/groupchat");
              
              return (
                <Link
                  key={label}
                  href={href}
                  className={`group/item relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-600/10"
                      : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, #8b5cf6, #6366f1)" } : {}}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${active ? "scale-105" : "group-hover/item:scale-105"}`} />
                  <span className="hidden lg:block truncate">{label}</span>
                  
                  {/* Badge */}
                  {badge && (
                    <span className="absolute right-3 hidden lg:flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500/10 dark:bg-violet-400/10 px-1.5 text-[10px] font-bold text-violet-500 dark:text-violet-400 border border-violet-500/20">
                      {badge}
                    </span>
                  )}

                  {/* Badge on collapsed view */}
                  {badge && (
                    <span className="lg:hidden absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Profile info at the bottom */}
        <div className="border-t border-border pt-4 px-1 space-y-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 group/profile cursor-pointer"
          >
            {profile?.avatar || user?.photoURL ? (
              <img
                src={profile?.avatar || user?.photoURL}
                className="w-9 h-9 rounded-xl border border-white/10 object-cover shadow-md group-hover/profile:scale-105 transition-transform"
                alt="avatar"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-tr from-violet-500 to-indigo-500 shrink-0">
                <User size={15} className="text-white" />
              </div>
            )}
            <div className="hidden lg:block min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate leading-tight group-hover/profile:text-primary transition-colors">
                {profile?.name || user?.name || "User"}
              </h4>
              <p className="text-[10px] text-muted-foreground truncate font-medium">
                {profile?.email || user?.email || "No email"}
              </p>
            </div>
          </Link>

          <div className="flex lg:flex-row flex-col gap-1 items-center justify-between">
            <Link
              href="/settings"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer"
              title="Settings"
            >
              <Settings size={14} />
            </Link>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    )}

      {/* ── Mobile Bottom Bar (logged in) ── */}
      {isLoggedIn && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-50 flex justify-around items-center h-16 rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-2">
          {/* Home */}
          <Link href="/users"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/users" ? "text-violet-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <Home size={18} />
            <span className="text-[9px] font-semibold">Home</span>
            {pathname === "/users" && <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5 animate-pulse" />}
          </Link>

          {/* Messages */}
          <Link href="/chat"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/chat" ? "text-violet-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <MessageCircle size={18} />
            <span className="text-[9px] font-semibold">Messages</span>
            {pathname === "/chat" && <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5 animate-pulse" />}
          </Link>

          {/* Groups FAB (Center) */}
          <div className="relative -top-4 flex flex-col items-center">
            {/* Pulsing ring outer effect */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-600 opacity-20 blur-sm animate-ping pointer-events-none" />
            <div className="absolute inset-0 rounded-full bg-violet-500/25 blur-md animate-pulse pointer-events-none" />
            <Link href="/dashboard"
              className={`flex items-center justify-center w-13 h-13 rounded-full border-4 border-background/95 shadow-[0_4px_16px_rgba(139,92,246,0.4)] transition-all transform active:scale-95 duration-200 z-10 ${
                pathname === "/dashboard"
                  ? "bg-gradient-to-tr from-violet-500 via-indigo-500 to-purple-600 text-white scale-105"
                  : "bg-card text-violet-500 hover:text-violet-400"
              }`}>
              <PlusCircle size={20} className={pathname === "/dashboard" ? "animate-pulse" : ""} />
            </Link>
            <span className="text-[9px] font-bold text-violet-500 mt-0.5 uppercase tracking-wider scale-90">Groups</span>
          </div>

          {/* Chatroom */}
          <Link href="/groupchat"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/groupchat" ? "text-violet-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <MessageCircleMore size={18} />
            <span className="text-[9px] font-semibold">Chatroom</span>
            {pathname === "/groupchat" && <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5 animate-pulse" />}
          </Link>

          {/* AI (Last in right side) */}
          <Link href="/ai"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/ai" ? "text-violet-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <Bot size={18} />
            <span className="text-[9px] font-semibold">AI</span>
            {pathname === "/ai" && <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5 animate-pulse" />}
          </Link>
        </div>
      )}


    </>
  );
}

// ── HELPER COMPONENT FOR PROFILE DROPDOWN ──
function DropdownItem({ href, onClick, icon, label }) {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-500/5 dark:hover:bg-violet-500/10 rounded-xl transition-all duration-150 hover:translate-x-0.5 cursor-pointer">
      <span className="text-slate-400 dark:text-slate-500 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block group">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} type="button" className="w-full text-left block group">
      {content}
    </button>
  );
}
