"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronRight,
  Home,
  MessageCircle,
  MessageCircleMore,
  PanelLeft,
  PlusCircle,
  Settings,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebaseClient";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

const LINKS = [
  { href: "/users", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageCircle, label: "Messages" },
  { href: "/dashboard", icon: PlusCircle, label: "Groups" },
  { href: "/groupchat", icon: MessageCircleMore, label: "Chatroom" },
  { href: "/ai", icon: Bot, label: "AI" },
];

const HIDDEN_ROUTES = ["/login", "/register", "/reset-password", "/admin", "/mcp-login"];

export default function AppSidebar() {
  const pathname = usePathname();
  const { token } = useAuth();
  const { collapsed, toggleSidebar } = useSidebar();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => auth.onAuthStateChanged(setFirebaseUser), []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    api.get("/profile").then((response) => setProfile(response.data)).catch(() => {});
  }, [token]);

  const hidden = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );

  if (!token || hidden) return null;

  const displayName = profile?.name || firebaseUser?.displayName || "Your account";
  const email = profile?.email || firebaseUser?.email || "";
  const avatar = profile?.profileImage?.url || profile?.avatar || firebaseUser?.photoURL;
  const initial = displayName.charAt(0).toUpperCase();

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === href || pathname?.startsWith("/groups/") || pathname === "/invites";
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 248 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="sidebar-shell fixed inset-y-0 left-0 z-[60] hidden overflow-hidden border-r border-foreground/[0.06] bg-card md:flex md:flex-col"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between px-5"}`}>
        {collapsed ? (
          // Collapsed: show the logo by default; on hover it swaps to the
          // expand control (click anywhere on it to expand the sidebar).
          <button
            type="button"
            onClick={toggleSidebar}
            className="group/brand relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-foreground/[0.06] active:scale-95"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <img
              src="/logo-concept-app.svg"
              alt="SplitEase"
              className="sidebar-logo absolute h-8 w-8 object-contain transition-opacity duration-150 group-hover/brand:opacity-0"
            />
            <PanelLeft
              size={18}
              strokeWidth={1.75}
              className="absolute text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover/brand:text-foreground group-hover/brand:opacity-100"
            />
          </button>
        ) : (
          <>
            <Link href="/users" className="flex min-w-0 items-center gap-2.5" aria-label="SplitEase home">
              <img src="/logo-concept-app.svg" alt="" className="sidebar-logo h-8 w-8 shrink-0 object-contain" />
              <span className="truncate font-brand text-[19px] font-medium tracking-wide text-foreground">
                SplitEase
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex flex-1 flex-col gap-3 pt-3 ${collapsed ? "px-3" : "px-4"}`}>
        {LINKS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-12 items-center rounded-full transition-colors duration-150 ${
                collapsed ? "justify-center px-0" : "justify-between gap-3 px-4"
              } ${
                active
                  ? "sidebar-nav-active bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground"
              }`}
            >
              <span className={`flex min-w-0 items-center ${collapsed ? "" : "gap-3.5"}`}>
                <Icon size={19} strokeWidth={1.75} className="shrink-0" />
                {!collapsed && (
                  <span className={`truncate text-[14px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
                )}
              </span>
              {!collapsed && active && (
                <ChevronRight size={17} strokeWidth={2} className="shrink-0 text-foreground" />
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className={`shrink-0 ${collapsed ? "p-3" : "p-4"}`}>
        <Link
          href="/profile"
          title={collapsed ? displayName : undefined}
          className={`group flex items-center rounded-2xl transition-colors duration-150 ${
            pathname === "/profile" ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.035]"
          } ${collapsed ? "justify-center p-2" : "gap-2.5 p-2"}`}
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-foreground/[0.08]" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-[13px] font-bold text-background">
              {initial || <User size={16} />}
            </span>
          )}
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-foreground">{displayName}</span>
              <span className="block truncate text-[10.5px] text-muted-foreground">{email || "View profile"}</span>
            </span>
          )}
          {!collapsed && (
            <Settings
              size={14}
              className="shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:rotate-45 group-hover:text-foreground"
            />
          )}
        </Link>
      </div>
    </motion.aside>
  );
}
