"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquare, Newspaper, Briefcase, LogOut,
  ChevronsUpDown, ExternalLink,
} from "lucide-react";
import { getAdminToken, clearAdminToken } from "@/lib/adminApi";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      { href: "/admin/careers", label: "Careers", icon: Briefcase },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function Logo() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] ring-1 ring-white/[0.1] shadow-[0_6px_16px_-6px_rgba(34,211,238,0.45)]">
      <img src="/logo-concept-app.svg" alt="SplitEase" className="h-full w-full object-cover" />
    </span>
  );
}

function NavLink({ item, active }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all ${
        active ? "bg-white/[0.06] text-white" : "text-white/45 hover:bg-white/[0.035] hover:text-white/85"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-300 to-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
      )}
      <item.icon size={16.5} className={active ? "text-cyan-300" : "text-white/30 group-hover:text-white/60"} strokeWidth={2.1} />
      {item.label}
    </Link>
  );
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    router.push("/login");
  };

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  if (!ready) {
    return <div className="min-h-screen bg-[#08080A]" />;
  }

  return (
    <div className="flex min-h-screen bg-[#08080A] text-white antialiased [font-feature-settings:'ss01']">
      {/* Ambient brand glow */}
      <div className="pointer-events-none fixed -left-20 top-0 h-[480px] w-[620px] rounded-full bg-cyan-500/[0.05] blur-[140px]" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-[380px] w-[480px] rounded-full bg-violet-500/[0.03] blur-[140px]" />

      <aside className="sticky top-0 z-10 hidden h-screen w-[248px] shrink-0 self-start flex-col border-r border-white/[0.06] bg-[#0A0A0D]/80 px-3.5 py-5 backdrop-blur-xl sm:flex">
        <Link href="/admin" className="mb-7 flex shrink-0 items-center gap-2.5 px-2">
          <Logo />
          <div>
            <p className="text-[13.5px] font-extrabold leading-tight tracking-tight">SplitEase</p>
            <p className="text-[9.5px] font-bold leading-tight tracking-[0.16em] text-white/30">ADMIN PANEL</p>
          </div>
        </Link>

        <nav className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 mb-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/35 transition-colors hover:bg-white/[0.035] hover:text-white/70"
        >
          <ExternalLink size={15} />
          View live site
        </a>

        <div ref={menuRef} className="relative shrink-0 border-t border-white/[0.06] pt-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.14] to-white/[0.04] text-[11px] font-extrabold text-white/80 ring-1 ring-white/[0.08]">
              GA
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-white">gautam@admin</span>
              <span className="block text-[10.5px] text-white/35">Administrator</span>
            </span>
            <ChevronsUpDown size={14} className="text-white/25" />
          </button>

          {menuOpen && (
            <div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#151518] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[13px] font-semibold text-white/70 transition-colors hover:bg-white/[0.05] hover:text-red-300"
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0A0A0D]/95 px-4 py-3 backdrop-blur-xl sm:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo />
          <span className="font-extrabold tracking-tight">Admin</span>
        </Link>
        <button onClick={handleLogout} className="text-white/45">
          <LogOut size={18} />
        </button>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/[0.07] bg-[#0A0A0D]/95 backdrop-blur-xl sm:hidden">
        {ALL_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold ${
                active ? "text-cyan-300" : "text-white/35"
              }`}
            >
              <item.icon size={18} strokeWidth={2.1} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="relative z-10 min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-9 sm:pb-12 sm:pt-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
