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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useTheme from "@/hooks/useTheme";
import { useNotifications } from "@/context/NotificationContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient";

const NAV_LINKS = [
  { href: "/users", icon: Home, label: "Home" },
  { href: "/dashboard", icon: PlusCircle, label: "Groups" },
  { href: "/chat", icon: MessageCircle, label: "Messages" },
  { href: "/groupchat", icon: MessageCircleMore, label: "Group Chat" },
  { href: "/ai", icon: Bot, label: "AI", highlight: true },
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

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToken(null);
      localStorage.removeItem("token");
      setDropdownOpen(false);
      router.push("/login");
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

  return (
    <nav
      className={`fixed top-4 inset-x-4 mx-auto z-50 max-w-7xl transition-all duration-300 rounded-2xl border ${
        scrolled
          ? "bg-background/60 backdrop-blur-2xl border-foreground/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          : "bg-background/30 backdrop-blur-xl border-foreground/5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
            <Split className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500 bg-clip-text text-transparent tracking-tight">
            SplitEase
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        {isLoggedIn ? (
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            {NAV_LINKS.map(({ href, icon: Icon, label, highlight }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-white shadow-md"
                      : highlight
                      ? "text-violet-500 hover:text-violet-400 hover:bg-violet-500/10"
                      : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, #8b5cf6, #6366f1)" } : {}}
                >
                  {highlight && !active && (
                    <Sparkles className="w-3 h-3 text-violet-400" />
                  )}
                  {!highlight && <Icon className="w-3.5 h-3.5" />}
                  {highlight && active && <Icon className="w-3.5 h-3.5" />}
                  {label}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-foreground/70 hover:text-foreground transition-all hover:bg-foreground/5"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg overflow-hidden group transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} />
              <Sparkles className="relative w-3.5 h-3.5" />
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
                <div className="absolute right-0 mt-3 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-50 overflow-hidden bg-background/95 backdrop-blur-2xl border border-foreground/10">
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
                className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-foreground/5 transition-all"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-7 h-7 rounded-lg border border-white/10 object-cover" alt="avatar" />
                ) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                    <User size={14} className="text-white" />
                  </div>
                )}
                <ChevronDown
                  size={13}
                  className={`text-foreground/40 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden bg-background/80 backdrop-blur-2xl border border-foreground/10">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    <User size={14} className="text-foreground/40" /> Profile
                  </Link>
                  <div className="my-1 mx-3 h-px bg-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Bar (logged in) ── */}
      {isLoggedIn && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-50 flex justify-around items-center py-2 px-4 rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {NAV_LINKS.slice(0, 4).map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                  active ? "text-violet-400" : "text-foreground/40 hover:text-foreground/70"
                }`}>
                <Icon size={18} />
                <span className="text-[9px] font-medium">{label}</span>
                {active && <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5" />}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Mobile (logged out) ── */}
      {!isLoggedIn && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-50 flex justify-around items-center py-2.5 px-4 rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <Link href="/login" className="text-sm font-semibold text-foreground/70 hover:text-foreground transition">Login</Link>
          <Link href="/register"
            className="text-sm font-semibold text-white px-4 py-1 rounded-lg"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}
