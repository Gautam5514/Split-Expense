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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import useTheme from "@/hooks/useTheme";
import { useNotifications } from "@/context/NotificationContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { api } from "@/lib/api";

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
      iconClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/15",
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
        className={`fixed top-4 inset-x-4 mx-auto z-50 max-w-7xl transition-all duration-300 rounded-2xl border ${
          scrolled
            ? "bg-background/65 backdrop-blur-2xl border-foreground/10 shadow-[0_8px_32px_rgba(8,145,178,0.08)]"
            : "bg-background/30 backdrop-blur-xl border-foreground/5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3.5">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-200">
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-cyan-600 via-teal-500 to-sky-500 dark:from-cyan-400 dark:via-teal-300 dark:to-sky-400 bg-clip-text text-transparent tracking-tight">
              SplitEase
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-foreground/[0.04] backdrop-blur-sm border border-foreground/[0.06]">
              {NAV_LINKS.map(({ href, icon: Icon, label, highlight }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "text-white shadow-md"
                        : highlight
                        ? "text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-cyan-500/10"
                        : "text-foreground/55 hover:text-foreground hover:bg-foreground/5"
                    }`}
                    style={active ? { background: "linear-gradient(135deg, #0891B2, #0E7490)" } : {}}
                  >
                    {highlight && !active && <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />}
                    {!highlight && <Icon className="w-3.5 h-3.5" />}
                    {highlight && active && <Icon className="w-3.5 h-3.5" />}
                    {label}
                  </Link>
                );
              })}
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
                style={{ background: "linear-gradient(135deg, #0891B2, #0E7490)" }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, #0E7490, #0891B2)" }} />
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
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl text-foreground/55 hover:text-foreground hover:bg-foreground/5 transition-all"
                  onClick={() => { setNotifOpen(!notifOpen); setHasUnread(false); }}
                  title="Notifications"
                >
                  <Bell size={17} />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed inset-x-4 top-[78px] mx-auto md:absolute md:inset-x-auto md:right-0 md:top-auto mt-3 w-auto md:w-[380px] max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl z-50 overflow-hidden bg-background/97 backdrop-blur-2xl border border-border">
                    <div className="relative overflow-hidden border-b border-border px-4 py-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-teal-500/8" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/10">
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
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 transition hover:bg-cyan-500/10"
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
                        <p className="text-sm font-semibold text-foreground">You're all caught up</p>
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
                                  <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground/80 group-hover:text-foreground">
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
              className="w-9 h-9 flex items-center justify-center rounded-xl text-foreground/55 hover:text-foreground hover:bg-foreground/5 transition-all"
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
                      ? "bg-cyan-500/10 ring-2 ring-cyan-500 dark:ring-cyan-400/80"
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
                      style={{ background: "linear-gradient(135deg, #0891B2, #0E7490)" }}>
                      <User size={13} className="text-white" />
                    </div>
                  )}
                  <ChevronDown
                    size={12}
                    className={`text-foreground/40 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-1.5 z-50 overflow-hidden bg-card/97 border border-border/70 backdrop-blur-2xl">
                    {/* Profile Header */}
                    <div className="flex items-center gap-3 px-3 py-3 border-b border-border/50 mb-1">
                      {profile?.avatar || user?.photoURL ? (
                        <div className="relative group shrink-0">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                          <img
                            src={profile?.avatar || user?.photoURL}
                            className="relative w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm"
                            alt="avatar"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-sm"
                          style={{ background: "linear-gradient(135deg, #0891B2, #0E7490)" }}>
                          <span className="text-white font-bold text-sm">
                            {(profile?.name || user?.displayName || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground truncate leading-tight">
                          {profile?.name || user?.displayName || "User"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                          {profile?.email || user?.email || "No email"}
                        </p>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="space-y-0.5">
                      <DropdownItem href="/profile" onClick={() => setDropdownOpen(false)} icon={<User size={14} />} label="Profile" />
                      <DropdownItem href="/theme" onClick={() => setDropdownOpen(false)} icon={<Palette size={14} />} label="Themes" />
                      <DropdownItem href="/settings" onClick={() => setDropdownOpen(false)} icon={<Settings size={14} />} label="Settings" />
                      <DropdownItem href="/downloadapp" onClick={() => setDropdownOpen(false)} icon={<Download size={14} />} label="Download Apps" />
                      <DropdownItem href="/helps" onClick={() => setDropdownOpen(false)} icon={<HelpCircle size={14} />} label="Help" />

                      <div className="my-1 mx-2 h-px bg-border" />

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

      {/* ── Mobile Bottom Bar ── */}
      {isLoggedIn && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-50 flex justify-around items-center h-16 rounded-2xl border border-foreground/10 bg-background/65 backdrop-blur-2xl shadow-[0_8px_32px_rgba(8,145,178,0.1)] px-2">

          <Link href="/users"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/users" ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <Home size={18} />
            <span className="text-[9px] font-semibold">Home</span>
            {pathname === "/users" && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-0.5" />}
          </Link>

          <Link href="/chat"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/chat" ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <MessageCircle size={18} />
            <span className="text-[9px] font-semibold">Messages</span>
            {pathname === "/chat" && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-0.5" />}
          </Link>

          {/* Groups FAB */}
          <div className="relative -top-4 flex flex-col items-center">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-600 opacity-20 blur-sm animate-ping pointer-events-none" />
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse pointer-events-none" />
            <Link href="/dashboard"
              className={`flex items-center justify-center w-13 h-13 rounded-full border-4 border-background/95 shadow-[0_4px_16px_rgba(8,145,178,0.45)] transition-all transform active:scale-95 duration-200 z-10 ${
                pathname === "/dashboard"
                  ? "bg-gradient-to-tr from-cyan-500 via-teal-500 to-cyan-600 text-white scale-105"
                  : "bg-card text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
              }`}>
              <PlusCircle size={20} className={pathname === "/dashboard" ? "animate-pulse" : ""} />
            </Link>
            <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 uppercase tracking-wider scale-90">Groups</span>
          </div>

          <Link href="/groupchat"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/groupchat" ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <MessageCircleMore size={18} />
            <span className="text-[9px] font-semibold">Chatroom</span>
            {pathname === "/groupchat" && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-0.5" />}
          </Link>

          <Link href="/ai"
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
              pathname === "/ai" ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <Bot size={18} />
            <span className="text-[9px] font-semibold">AI</span>
            {pathname === "/ai" && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-0.5" />}
          </Link>
        </div>
      )}
    </>
  );
}

function DropdownItem({ href, onClick, icon, label }) {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-foreground hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 rounded-xl transition-all duration-150 hover:translate-x-0.5 cursor-pointer">
      <span className="text-muted-foreground transition-colors shrink-0">{icon}</span>
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
