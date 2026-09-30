"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  CornerDownLeft,
  Download,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  MessageCircleMore,
  Palette,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { api } from "@/lib/api";
import { getGroupIcon } from "@/lib/groupIcons";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useSidebar } from "@/context/SidebarContext";
import useDebounce from "@/hooks/useDebounce";
import ThemeToggle from "@/components/ThemeToggle";

const SEARCH_ITEMS = [
  { href: "/users", label: "Home", description: "Overview, balances and recent activity", icon: Home },
  { href: "/chat", label: "Messages", description: "Direct conversations with friends", icon: MessageCircle },
  { href: "/dashboard", label: "Groups", description: "Create and manage expense groups", icon: PlusCircle },
  { href: "/groupchat", label: "Chatroom", description: "Conversations inside your groups", icon: MessageCircleMore },
  { href: "/ai", label: "SplitEase AI", description: "Ask questions about your expenses", icon: Bot },
  { href: "/profile", label: "Profile", description: "Personal details and referrals", icon: User },
  { href: "/settings", label: "Settings", description: "Privacy and account preferences", icon: Settings },
  { href: "/theme", label: "Themes", description: "Personalize your workspace", icon: Palette },
  { href: "/helps", label: "Help center", description: "Answers and product guidance", icon: HelpCircle },
];

const PAGE_TITLES = [
  { href: "/users", title: "Home" },
  { href: "/chat", title: "Messages" },
  { href: "/dashboard", title: "Groups" },
  { href: "/groups", title: "Group" },
  { href: "/groupchat", title: "Chatroom" },
  { href: "/ai", title: "SplitEase AI" },
  { href: "/profile", title: "Profile" },
  { href: "/settings", title: "Settings" },
  { href: "/theme", title: "Themes" },
  { href: "/helps", title: "Help center" },
];

// Pages reachable straight from the sidebar - back makes no sense on these,
// only once you've gone deeper (a group, a card inside it, ...).
const SIDEBAR_ROOTS = SEARCH_ITEMS.map((item) => item.href);

const HIDDEN_ROUTES = ["/login", "/register", "/reset-password", "/admin", "/mcp-login"];

export default function DesktopAppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, setToken } = useAuth();
  const { collapsed } = useSidebar();
  const { notifications, hasUnread, setHasUnread, markAllAsRead, markOneAsRead } = useNotifications();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // Live global search across groups, people and expenses.
  const [searchData, setSearchData] = useState({ groups: [], people: [], expenses: [] });
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef(null);
  const navRef = useRef(null);
  const debouncedQuery = useDebounce(query.trim(), 250);

  // Back is only meaningful once the user has moved through at least one page
  // inside the app. Track how deep we are: +1 per in-app navigation, -1 on a
  // browser back, reset when arriving from login etc. Kept in sessionStorage
  // so a refresh doesn't hide the button while history still exists.
  const [canGoBack, setCanGoBack] = useState(false);
  const depthRef = useRef(0);
  const prevPathRef = useRef(null);
  const poppedRef = useRef(false);

  useEffect(() => {
    const onPop = () => { poppedRef.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const prev = prevPathRef.current;
    if (prev === null) {
      try { depthRef.current = Number(sessionStorage.getItem("nav-depth")) || 0; } catch { depthRef.current = 0; }
    } else if (prev !== pathname) {
      if (poppedRef.current) depthRef.current = Math.max(0, depthRef.current - 1);
      else if (HIDDEN_ROUTES.some((r) => prev === r || prev.startsWith(`${r}/`))) depthRef.current = 0;
      else depthRef.current += 1;
    }
    poppedRef.current = false;
    prevPathRef.current = pathname;
    try { sessionStorage.setItem("nav-depth", String(depthRef.current)); } catch {}
    setCanGoBack(depthRef.current > 0);
  }, [pathname]);

  useEffect(() => auth.onAuthStateChanged(setFirebaseUser), []);

  useEffect(() => {
    if (!token) return setProfile(null);
    api.get("/profile").then((response) => setProfile(response.data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
        setSearchData({ groups: [], people: [], expenses: [] });
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    const onPointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  // Fetch live results from the unified global-search endpoint (debounced).
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchData({ groups: [], people: [], expenses: [] });
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    api
      .get("/users/search/global", { params: { q: debouncedQuery } })
      .then((res) => {
        if (cancelled) return;
        setSearchData({
          groups: res.data?.groups || [],
          people: res.data?.people || [],
          expenses: res.data?.expenses || [],
        });
      })
      .catch(() => {
        if (!cancelled) setSearchData({ groups: [], people: [], expenses: [] });
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Static in-app pages that match the query (client-side).
  const pageMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SEARCH_ITEMS.slice(0, 5);
    return SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(normalized),
    ).slice(0, 5);
  }, [query]);

  // A single flat, ordered list of every actionable result — powers keyboard
  // navigation (↑/↓/Enter) across all categories at once.
  const flatResults = useMemo(() => {
    const groups = searchData.groups.map((g) => ({ kind: "group", data: g }));
    const people = searchData.people.map((p) => ({ kind: "person", data: p }));
    const expenses = searchData.expenses.map((e) => ({ kind: "expense", data: e }));
    const pages = pageMatches.map((p) => ({ kind: "page", data: p }));
    return [...groups, ...people, ...expenses, ...pages];
  }, [searchData, pageMatches]);

  // Reset the highlighted row whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length, debouncedQuery]);

  const hasQuery = query.trim().length > 0;
  const hasLiveResults =
    searchData.groups.length + searchData.people.length + searchData.expenses.length > 0;

  const pageTitle = useMemo(() => {
    if (!pathname) return "SplitEase";
    const exact = PAGE_TITLES.find((item) => pathname === item.href);
    if (exact) return exact.title;
    const nested = PAGE_TITLES.find((item) => item.href !== "/users" && pathname.startsWith(`${item.href}/`));
    return nested ? nested.title : "SplitEase";
  }, [pathname]);

  const hidden = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  if (!token || hidden) return null;

  const displayName = profile?.name || firebaseUser?.displayName || "Your account";
  const email = profile?.email || firebaseUser?.email || "Signed in";
  const avatar = profile?.profileImage?.url || profile?.avatar || firebaseUser?.photoURL;
  const unreadCount = notifications.filter((item) => !item.read).length;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setSearchData({ groups: [], people: [], expenses: [] });
  };

  const goToResult = (href) => {
    router.push(href);
    closeSearch();
  };

  // Route each result type to the right destination:
  //  • group   → open the group's chatroom (deep-link auto-opens it)
  //  • person  → open the direct chat with that person (deep-link)
  //  • expense → open the group the expense lives in
  //  • page    → static navigation
  const navigateTo = (item) => {
    if (!item) return;
    const { kind, data } = item;
    if (kind === "group") router.push(`/groupchat?open=${data.id}`);
    else if (kind === "person") router.push(`/chat?open=${data.id}`);
    else if (kind === "expense") router.push(`/groups/${data.groupId}`);
    else if (kind === "page") router.push(data.href);
    closeSearch();
  };

  const openSearch = () => {
    setSearchOpen((open) => {
      const next = !open;
      if (next) requestAnimationFrame(() => searchInputRef.current?.focus());
      return next;
    });
    setNotificationsOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("token");
    setToken(null);
    router.replace("/");
  };

  return (
    <header
      ref={navRef}
      className={`fixed right-0 top-0 z-50 hidden h-16 items-center justify-between gap-3 border-b border-foreground/[0.08] bg-card px-5 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex ${
        collapsed ? "left-20" : "left-[248px]"
      }`}
    >
      {/* Left: back + page title */}
      <div className="flex min-w-0 items-center gap-3">
        {canGoBack && !SIDEBAR_ROOTS.includes(pathname) && (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-foreground/[0.06] active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={19} strokeWidth={2} />
          </button>
        )}
        <h1 className="truncate text-[19px] font-bold tracking-[-0.01em] text-foreground">{pageTitle}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            {searchOpen ? (
              <motion.div
                key="input"
                initial={{ width: 40, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 40, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative h-10 overflow-hidden rounded-full border border-cyan-500/35 bg-foreground/[0.03] ring-4 ring-cyan-500/[0.06]"
              >
                {searching ? (
                  <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-cyan-500" size={16} />
                ) : (
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                )}
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveIndex((i) => Math.min(i + 1, Math.max(flatResults.length - 1, 0)));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveIndex((i) => Math.max(i - 1, 0));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      if (flatResults[activeIndex]) navigateTo(flatResults[activeIndex]);
                    }
                  }}
                  placeholder="Search groups, people, expenses..."
                  aria-label="Global search"
                  className="h-10 w-[360px] bg-transparent pl-10 pr-9 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/65"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="icon"
                type="button"
                onClick={openSearch}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-all duration-200 hover:border-foreground/[0.08] hover:bg-foreground/[0.05] hover:text-foreground active:scale-95"
                aria-label="Search"
              >
                <Search size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.985 }}
                className="absolute right-0 top-[48px] max-h-[70vh] w-[400px] overflow-y-auto custom-scrollbar rounded-2xl border border-border bg-menu-solid p-2 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.38)]"
              >
                <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                    {hasQuery ? "Search results" : "Quick navigation"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <CornerDownLeft size={11} /> to open
                  </span>
                </div>

                {/* Loading skeleton while a query is in flight and we have nothing yet */}
                {hasQuery && searching && !hasLiveResults ? (
                  <div className="space-y-1.5 px-1 py-2">
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="flex items-center gap-3 rounded-xl px-1.5 py-2">
                        <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06]" />
                        <span className="flex-1 space-y-1.5">
                          <span className="block h-3 w-2/3 animate-pulse rounded bg-foreground/[0.06]" />
                          <span className="block h-2.5 w-1/3 animate-pulse rounded bg-foreground/[0.05]" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* GROUPS */}
                    {searchData.groups.length > 0 && (
                      <ResultSection label="Groups">
                        {searchData.groups.map((g) => {
                          const idx = flatResults.findIndex((r) => r.kind === "group" && r.data.id === g.id);
                          const GroupIcon = getGroupIcon(g.icon);
                          return (
                            <ResultRow
                              key={`group-${g.id}`}
                              active={idx === activeIndex}
                              onClick={() => navigateTo({ kind: "group", data: g })}
                              onMouseEnter={() => setActiveIndex(idx)}
                              avatar={
                                g.photoUrl ? (
                                  <img src={g.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                                ) : GroupIcon ? (
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><GroupIcon size={17} /></span>
                                ) : (
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-xs font-black text-white">{g.title?.charAt(0)?.toUpperCase()}</span>
                                )
                              }
                              title={g.title}
                              subtitle={g.subtitle}
                              badge="Open chatroom"
                            />
                          );
                        })}
                      </ResultSection>
                    )}

                    {/* PEOPLE */}
                    {searchData.people.length > 0 && (
                      <ResultSection label="People">
                        {searchData.people.map((p) => {
                          const idx = flatResults.findIndex((r) => r.kind === "person" && r.data.id === p.id);
                          return (
                            <ResultRow
                              key={`person-${p.id}`}
                              active={idx === activeIndex}
                              onClick={() => navigateTo({ kind: "person", data: p })}
                              onMouseEnter={() => setActiveIndex(idx)}
                              avatar={
                                p.photoUrl ? (
                                  <img src={p.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                                ) : (
                                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-black text-white">{p.title?.charAt(0)?.toUpperCase()}</span>
                                )
                              }
                              title={p.title}
                              subtitle={p.subtitle}
                              badge="Message"
                            />
                          );
                        })}
                      </ResultSection>
                    )}

                    {/* EXPENSES */}
                    {searchData.expenses.length > 0 && (
                      <ResultSection label="Expenses">
                        {searchData.expenses.map((e) => {
                          const idx = flatResults.findIndex((r) => r.kind === "expense" && r.data.id === e.id);
                          return (
                            <ResultRow
                              key={`expense-${e.id}`}
                              active={idx === activeIndex}
                              onClick={() => navigateTo({ kind: "expense", data: e })}
                              onMouseEnter={() => setActiveIndex(idx)}
                              avatar={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><ReceiptText size={17} /></span>}
                              title={e.title}
                              subtitle={e.subtitle}
                              badge="View group"
                            />
                          );
                        })}
                      </ResultSection>
                    )}

                    {/* PAGES */}
                    {pageMatches.length > 0 && (
                      <ResultSection label={hasQuery ? "Pages" : "Quick navigation"}>
                        {pageMatches.map((item) => {
                          const idx = flatResults.findIndex((r) => r.kind === "page" && r.data.href === item.href);
                          const Icon = item.icon;
                          return (
                            <ResultRow
                              key={`page-${item.href}`}
                              active={idx === activeIndex}
                              onClick={() => navigateTo({ kind: "page", data: item })}
                              onMouseEnter={() => setActiveIndex(idx)}
                              avatar={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.05] text-muted-foreground"><Icon size={17} /></span>}
                              title={item.label}
                              subtitle={item.description}
                            />
                          );
                        })}
                      </ResultSection>
                    )}

                    {/* EMPTY STATE */}
                    {hasQuery && !searching && !hasLiveResults && pageMatches.length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <Search className="mx-auto mb-2 text-muted-foreground/50" size={22} />
                        <p className="text-sm font-bold text-foreground">No results for "{query.trim()}"</p>
                        <p className="mt-1 text-xs text-muted-foreground">Try a group name, a friend's name, an email, or an expense.</p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThemeToggle className="h-8 w-[56px]" />

        <div className="relative">
          <button
            type="button"
            onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); setSearchOpen(false); setHasUnread(false); }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-all duration-200 hover:border-foreground/[0.08] hover:bg-foreground/[0.05] hover:text-foreground active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {hasUnread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />}
          </button>
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} className="absolute right-0 top-[52px] w-[370px] overflow-hidden rounded-2xl border border-border bg-menu-solid shadow-[0_24px_70px_-20px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><p className="text-sm font-extrabold text-foreground">Notifications</p><p className="mt-0.5 text-[11px] text-muted-foreground">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p></div>{notifications.length > 0 && <button type="button" onClick={markAllAsRead} className="text-xs font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400">Clear all</button>}</div>
                {notifications.length ? (
                  <div className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar">{notifications.slice(0, 8).map((item, index) => { const ExpenseIcon = item.type === "expense" ? ReceiptText : UsersRound; return <button key={item._id || index} type="button" onClick={() => { markOneAsRead(item._id); router.push(item.link || "/dashboard"); setNotificationsOpen(false); }} className="flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-foreground/[0.045]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><ExpenseIcon size={17} /></span><span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs font-semibold leading-5 text-foreground/85">{item.message}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={10} /> Recent update</span></span></button>; })}</div>
                ) : (
                  <div className="px-5 py-9 text-center"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={25} /><p className="text-sm font-bold text-foreground">Nothing new</p><p className="mt-1 text-xs text-muted-foreground">Updates from your groups will appear here.</p></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); setSearchOpen(false); }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${profileOpen ? "ring-2 ring-primary/40" : "hover:ring-2 hover:ring-foreground/10"}`}
            aria-label="Open account menu"
          >
            {avatar ? <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-xs font-black text-white">{displayName.charAt(0).toUpperCase()}</span>}
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} className="absolute right-0 top-[52px] w-72 rounded-2xl border border-border bg-menu-solid p-2 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.4)]">
                <div className="mb-1 flex items-center gap-3 border-b border-border px-2.5 py-3">
                  {avatar ? <img src={avatar} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-sm font-black text-white">{displayName.charAt(0).toUpperCase()}</span>}
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-foreground">{displayName}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{email}</span></span>
                </div>
                <ProfileItem href="/profile" icon={User} label="Profile" onClick={() => setProfileOpen(false)} />
                <ProfileItem href="/theme" icon={Palette} label="Themes" onClick={() => setProfileOpen(false)} />
                <ProfileItem href="/settings" icon={Settings} label="Settings" onClick={() => setProfileOpen(false)} />
                <ProfileItem href="/downloadapp" icon={Download} label="Download App" onClick={() => setProfileOpen(false)} />
                <ProfileItem href="/helps" icon={HelpCircle} label="Help" onClick={() => setProfileOpen(false)} />
                <div className="my-1 h-px bg-border" />
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10"><LogOut size={15} /> Logout</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function ProfileItem({ href, icon: Icon, label, onClick }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground transition hover:bg-cyan-500/[0.07] hover:text-cyan-600 dark:hover:text-cyan-400"><Icon size={15} className="text-muted-foreground" />{label}</Link>;
}

// A labeled group of search results (Groups / People / Expenses / Pages).
function ResultSection({ label, children }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2.5 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground/80">{label}</p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

// A single actionable search row with avatar, title, subtitle and an optional
// action badge that appears on hover / when keyboard-focused.
function ResultRow({ active, onClick, onMouseEnter, avatar, title, subtitle, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
        active ? "bg-cyan-500/[0.1]" : "hover:bg-cyan-500/[0.07]"
      }`}
    >
      <span className="shrink-0">{avatar}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-foreground">{title}</span>
        {subtitle ? <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span> : null}
      </span>
      {badge ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-cyan-600 transition dark:text-cyan-400 ${
            active ? "bg-cyan-500/15 opacity-100" : "bg-cyan-500/10 opacity-0 group-hover:opacity-100"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
