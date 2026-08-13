"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell, LogOut, User, ChevronDown,
  Home, PlusCircle, MessageCircle, MessageCircleMore,
  Bot, Sparkles, ReceiptText, UsersRound, CheckCircle2,
  Clock3, BellRing, Settings, Palette, Download, HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { api } from "@/lib/api";
import HideOnScrollNav from "@/components/HideOnScrollNav";
import CoinBadge from "@/components/CoinBadge";
import ThemeToggle from "@/components/ThemeToggle";
import useCoins from "@/hooks/useCoins";

const NAV_LINKS = [
  { href: "/users",      icon: Home,             label: "Home" },
  { href: "/chat",       icon: MessageCircle,    label: "Messages" },
  { href: "/dashboard",  icon: PlusCircle,       label: "Groups", highlight: true },
  { href: "/groupchat",  icon: MessageCircleMore, label: "Chatroom" },
  { href: "/ai",         icon: Bot,              label: "AI" },
];

// Shown in mobile bottom bar (5 items - Groups is the raised FAB)
const BOTTOM_LINKS = [
  { href: "/users",     icon: Home,             label: "Home" },
  { href: "/chat",      icon: MessageCircle,    label: "Messages" },
  { href: "/groupchat", icon: MessageCircleMore, label: "Chatroom" },
  { href: "/ai",        icon: Bot,              label: "AI" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, setToken } = useAuth();
  const { notifications, hasUnread, setHasUnread, markAllAsRead, markOneAsRead } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState(null);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const coins = useCoins();

  const cleanPath = pathname?.replace(/\/$/, "") || "";
  const isAuthPage =
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/register") ||
    cleanPath.startsWith("/reset-password") ||
    cleanPath.startsWith("/admin");

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
        .catch(() => {});
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
    if (type === "expense") return {
      label: "Expense", Icon: ReceiptText,
      iconClass: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/15",
    };
    return {
      label: "Group", Icon: UsersRound,
      iconClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/15",
    };
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const diff = Math.floor((Date.now() - date) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        profileRef.current && !profileRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (isAuthPage) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* ── Top Navbar ── */}
      <HideOnScrollNav>
      <nav
        className={`w-full border-b transition-colors duration-300 ${
          !isLoggedIn
            ? scrolled
              ? "bg-black/80 backdrop-blur-2xl border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
              : "bg-black/40 backdrop-blur-xl border-white/5"
            : scrolled
              ? "bg-background/90 backdrop-blur-2xl border-foreground/10 shadow-[0_4px_24px_rgba(8,145,178,0.06)]"
              : "bg-background/70 backdrop-blur-xl border-foreground/[0.06]"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full px-4 sm:px-6 py-3 sm:py-3.5">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-200 bg-zinc-950 shrink-0">
              <img src="/logo-concept-a.svg" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className={`font-extrabold text-base sm:text-xl tracking-tight transition-all duration-300 ${
              !isLoggedIn 
                ? "text-white font-serif-premium lowercase text-lg sm:text-2xl" 
                : "brand-text"
            }`}>
              SplitEase
            </span>
          </Link>

          {/* Desktop Nav - md+ */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-foreground/[0.04] backdrop-blur-sm border border-foreground/[0.06]">
              {NAV_LINKS.map(({ href, icon: Icon, label, highlight }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-200 ${
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
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link
                href="/what-we-offer"
                className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5"
              >
                What we offer
              </Link>
              <Link
                href="/pricing"
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className="hidden md:block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5"
              >
                Blog
              </Link>
              <Link
                href="/login"
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Get started
              </Link>
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Notifications */}
            {isLoggedIn && (
              <div className="relative" ref={notifRef}>
                <button
                  className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-foreground/55 hover:text-foreground hover:bg-foreground/5 transition-all"
                  onClick={() => { setNotifOpen(!notifOpen); setHasUnread(false); }}
                  title="Notifications"
                >
                  <Bell size={16} />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-x-3 top-[70px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-auto sm:mt-3 sm:w-[380px] max-w-[calc(100vw-1.5rem)] sm:max-w-[380px] rounded-xl shadow-2xl z-50 overflow-hidden bg-background/97 backdrop-blur-2xl border border-border"
                    >
                      <div className="relative overflow-hidden border-b border-border px-4 py-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-teal-500/8" />
                        <div className="relative flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/10">
                              <BellRing size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Notifications</h4>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {notifications.length
                                  ? `${notifications.length} update${notifications.length === 1 ? "" : "s"}`
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
                          <p className="mt-1 text-xs text-muted-foreground">New trip, group, and expense updates will appear here.</p>
                        </div>
                      ) : (
                        <ul className="max-h-[320px] overflow-y-auto p-2 custom-scrollbar">
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
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {label}
                                      </span>
                                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock3 size={11} />
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Theme Toggle */}
            {isLoggedIn && <ThemeToggle />}

            {/* Profile Menu */}
            {isLoggedIn && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-1 pl-0.5 pr-1.5 py-1 rounded-2xl transition-all duration-200 ${
                    dropdownOpen ? "bg-cyan-500/10 ring-2 ring-cyan-500 dark:ring-cyan-400/80" : "hover:bg-foreground/5"
                  }`}
                >
                  <span className="relative shrink-0">
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
                    <CoinBadge coins={coins} className="-top-1.5 -right-1.5" />
                  </span>
                  <ChevronDown size={11} className={`text-foreground/40 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-x-3 top-[70px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-auto sm:mt-3 sm:w-72 max-w-[calc(100vw-1.5rem)] sm:max-w-72 rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-1.5 z-50 bg-card/97 border border-border/70 backdrop-blur-2xl"
                    >
                      {/* Profile Header */}
                      <div className="flex items-center gap-3 px-3 py-3 border-b border-border/50 mb-1">
                        {profile?.avatar || user?.photoURL ? (
                          <div className="relative shrink-0">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full blur opacity-25" />
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

                      <div className="space-y-0.5">
                        <DropdownItem href="/profile"     onClick={() => setDropdownOpen(false)} icon={<User size={14} />}        label="Profile" />
                        <DropdownItem href="/theme"       onClick={() => setDropdownOpen(false)} icon={<Palette size={14} />}     label="Themes" />
                        <DropdownItem href="/settings"    onClick={() => setDropdownOpen(false)} icon={<Settings size={14} />}    label="Settings" />
                        <DropdownItem href="/downloadapp" onClick={() => setDropdownOpen(false)} icon={<Download size={14} />}    label="Download App" />
                        <DropdownItem href="/helps"       onClick={() => setDropdownOpen(false)} icon={<HelpCircle size={14} />}  label="Help" />
                        <div className="my-1 mx-2 h-px bg-border" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all hover:translate-x-0.5"
                        >
                          <LogOut size={14} /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </nav>
      </HideOnScrollNav>

      {/* ── Mobile + Tablet Bottom Bar (hidden on md+) ── */}
      {isLoggedIn && pathname !== "/ai" && (
        <div className="md:hidden fixed bottom-3 inset-x-3 z-50 flex justify-around items-center h-16 rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(8,145,178,0.12)] px-1">

          {/* Left 2 links */}
          {BOTTOM_LINKS.slice(0, 2).map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
                pathname === href ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-semibold">{label}</span>
              {pathname === href && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400" />}
            </Link>
          ))}

          {/* Groups FAB - center raised button */}
          <div className="relative -top-4 flex flex-col items-center">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-600 opacity-20 blur-sm animate-ping pointer-events-none" />
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse pointer-events-none" />
            <Link
              href="/dashboard"
              className={`flex items-center justify-center w-13 h-13 rounded-full border-4 border-background/95 shadow-[0_4px_16px_rgba(8,145,178,0.45)] transition-all transform active:scale-95 duration-200 z-10 ${
                pathname === "/dashboard"
                  ? "bg-gradient-to-tr from-cyan-500 via-teal-500 to-cyan-600 text-white scale-105"
                  : "bg-card text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
              }`}
              style={{ width: 52, height: 52 }}
            >
              <PlusCircle size={22} className={pathname === "/dashboard" ? "animate-pulse" : ""} />
            </Link>
            <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 uppercase tracking-wider">Groups</span>
          </div>

          {/* Right 2 links */}
          {BOTTOM_LINKS.slice(2).map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl transition-all ${
                pathname === href ? "text-cyan-500 dark:text-cyan-400" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-semibold">{label}</span>
              {pathname === href && <span className="w-1 h-1 rounded-full bg-cyan-500 dark:bg-cyan-400" />}
              {/* Unread dot on Messages */}
              {href === "/chat" && hasUnread && pathname !== "/chat" && (
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.7)]" />
              )}
            </Link>
          ))}
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
    return <Link href={href} onClick={onClick} className="block group">{content}</Link>;
  }
  return <button onClick={onClick} type="button" className="w-full text-left block group">{content}</button>;
}
