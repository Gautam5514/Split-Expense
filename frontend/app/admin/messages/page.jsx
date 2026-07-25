"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail, Phone, Trash2, Inbox, Send, CheckCheck, ArrowLeft, RotateCcw, Search, X,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { IconButton, PageHeader, StatusPill } from "@/components/admin/AdminUI";

// Built as a two-pane inbox rather than a list of expanded cards: opening a
// message is what marks it read (same as any mail client), so the only status
// the admin ever has to set by hand is "resolved".

const SUBJECT_LABEL = {
  general: "General",
  support: "Support",
  billing: "Billing",
  partnership: "Partnership",
  feedback: "Feedback",
  bug: "Bug report",
};

const TABS = [
  { key: "inbox", label: "Inbox", match: (m) => m.status !== "resolved" },
  { key: "resolved", label: "Resolved", match: (m) => m.status === "resolved" },
  { key: "all", label: "All", match: () => true },
];

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const shortTime = (value) => {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 43200) return `${Math.floor(mins / 1440)}d`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const dayLabel = (value) =>
  new Date(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

const clockLabel = (value) =>
  new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function MessageRow({ message, active, onSelect }) {
  const unread = message.status === "new";

  return (
    <button
      type="button"
      onClick={() => onSelect(message)}
      className={`relative flex w-full items-start gap-3 border-b border-white/[0.05] px-3.5 py-3 text-left transition-colors ${
        active ? "bg-white/[0.07]" : "hover:bg-white/[0.035]"
      }`}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[2.5px] bg-gradient-to-b from-cyan-300 to-cyan-500" />}

      <span
        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
          unread ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-transparent"
        }`}
      />

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/25 to-cyan-600/10 text-[11px] font-extrabold text-cyan-300 ring-1 ring-white/[0.06]">
        {initials(message.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[13.5px] ${unread ? "font-extrabold text-white" : "font-semibold text-white/60"}`}>
            {message.name}
          </span>
          <span className="shrink-0 text-[10.5px] font-semibold text-white/30">{shortTime(message.createdAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-violet-300/70">
            {SUBJECT_LABEL[message.subject] || "General"}
          </span>
          {message.status === "resolved" && <CheckCheck size={11} className="shrink-0 text-emerald-400/70" />}
        </span>
        <span className="mt-1 block truncate text-[12px] leading-snug text-white/35">{message.message}</span>
      </span>
    </button>
  );
}

function MessageDetail({ message, busy, onBack, onResolve, onDelete }) {
  const resolved = message.status === "resolved";
  const firstName = message.name?.trim().split(/\s+/)[0] || "them";
  const replyHref = `mailto:${message.email}?subject=${encodeURIComponent(
    `Re: ${SUBJECT_LABEL[message.subject] || "Your message"} — SplitEase`,
  )}`;

  return (
    <>
      {/* ── Conversation header ── */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.015] px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-white/50 transition-colors hover:text-white sm:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/25 to-cyan-600/10 text-[12.5px] font-extrabold text-cyan-300 ring-1 ring-white/[0.08]">
          {initials(message.name)}
          {resolved && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[#04222A] ring-2 ring-[#111114]">
              <CheckCheck size={9} strokeWidth={3} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-extrabold text-white">{message.name}</p>
            <StatusPill tone="violet">{SUBJECT_LABEL[message.subject] || "General"}</StatusPill>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
            <a href={`mailto:${message.email}`} className="flex items-center gap-1.5 text-[11.5px] text-white/35 hover:text-cyan-300">
              <Mail size={10.5} /> {message.email}
            </a>
            {message.phone && (
              <a href={`tel:${message.phone}`} className="flex items-center gap-1.5 text-[11.5px] text-white/35 hover:text-cyan-300">
                <Phone size={10.5} /> {message.phone}
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onResolve}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              resolved
                ? "border-white/[0.1] bg-white/[0.03] text-white/55 hover:border-white/[0.2] hover:text-white"
                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300 hover:border-emerald-400/45 hover:bg-emerald-400/20"
            }`}
          >
            {resolved ? <RotateCcw size={12.5} /> : <CheckCheck size={13} />}
            <span className="hidden md:inline">{resolved ? "Reopen" : "Resolve"}</span>
          </button>
          <IconButton icon={Trash2} tone="danger" disabled={busy} onClick={onDelete} />
        </div>
      </div>

      {/* ── Thread ── */}
      <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(34,211,238,0.05),transparent_70%)]" />

        <div className="relative mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/[0.07]" />
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white/35">
            {dayLabel(message.createdAt)}
          </span>
          <span className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <div className="relative flex items-end gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-cyan-600/5 text-[10px] font-extrabold text-cyan-300/80 ring-1 ring-white/[0.06]">
            {initials(message.name)}
          </span>
          <div className="min-w-0 max-w-[min(46rem,88%)]">
            <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-gradient-to-br from-white/[0.07] to-white/[0.025] px-4 py-3 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9)]">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">{message.message}</p>
            </div>
            <p className="mt-1.5 pl-1 text-[10.5px] font-medium text-white/25">{clockLabel(message.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* ── Composer: looks like a chat input, hands off to the mail client ── */}
      <div className="border-t border-white/[0.07] bg-white/[0.015] p-3 sm:px-4">
        <a
          href={replyHref}
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2 pl-4 pr-2 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.05]"
        >
          <span className="flex-1 truncate text-[13.5px] text-white/30 transition-colors group-hover:text-white/50">
            Reply to {firstName} by email…
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-500 text-[#04222A] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-8px_rgba(34,211,238,0.6)] transition-transform group-hover:scale-105 group-active:scale-95">
            <Send size={15} strokeWidth={2.3} />
          </span>
        </a>
      </div>
    </>
  );
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("inbox");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.get("/admin/contact-messages");
        setMessages(data);
      } catch {
        toast.error("Failed to load messages.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unreadCount = useMemo(() => messages.filter((m) => m.status === "new").length, [messages]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, messages.filter(t.match).length])),
    [messages],
  );

  const visible = useMemo(() => {
    const matchTab = TABS.find((t) => t.key === tab).match;
    const q = query.trim().toLowerCase();
    return messages.filter(
      (m) =>
        matchTab(m) &&
        (!q ||
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.message?.toLowerCase().includes(q)),
    );
  }, [messages, tab, query]);

  const selected = messages.find((m) => m._id === selectedId) || null;

  // Opening a message is the "read" signal - no separate button for it.
  const open = (message) => {
    setSelectedId(message._id);
    if (message.status !== "new") return;
    setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, status: "read" } : m)));
    adminApi.patch(`/admin/contact-messages/${message._id}`, { status: "read" }).catch(() => {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, status: "new" } : m)));
    });
  };

  const toggleResolved = async () => {
    const next = selected.status === "resolved" ? "read" : "resolved";
    setBusy(true);
    try {
      await adminApi.patch(`/admin/contact-messages/${selected._id}`, { status: next });
      setMessages((prev) => prev.map((m) => (m._id === selected._id ? { ...m, status: next } : m)));
      toast.success(next === "resolved" ? "Marked resolved." : "Message reopened.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this message permanently?")) return;
    setBusy(true);
    try {
      await adminApi.delete(`/admin/contact-messages/${selected._id}`);
      setMessages((prev) => prev.filter((m) => m._id !== selected._id));
      setSelectedId(null);
      toast.success("Message deleted.");
    } catch {
      toast.error("Failed to delete message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        className="mb-5"
        eyebrow={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        title="Contact messages"
        description="Everything submitted through the Contact Us page."
      />

      {/* Sized to the leftover viewport (page chrome ≈ 11.5rem) so the inbox
          fills the screen without ever scrolling the page itself - long lists
          and long messages scroll inside their own pane. */}
      <div className="flex gap-4 sm:h-[calc(100dvh-12rem)]">
        {/* ── List pane ── */}
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] sm:w-[330px] sm:shrink-0 lg:w-[380px]">
          <div className="border-b border-white/[0.07] p-2.5">
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or text…"
                className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] py-2 pl-9 pr-8 text-[12.5px] text-white placeholder:text-white/25 outline-none transition focus:border-cyan-400/40 focus:bg-white/[0.05]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition-colors ${
                    tab === t.key ? "bg-white/[0.08] text-white" : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10.5px] font-extrabold tabular-nums text-white/30">{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-px p-2.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/[0.025]" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
                <Inbox size={22} className="mb-3 text-white/20" />
                <p className="text-[13px] font-bold text-white/55">
                  {query ? "No matches" : tab === "inbox" ? "Inbox zero" : "Nothing here"}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  {query ? "Try a different search term." : "New submissions will land here."}
                </p>
              </div>
            ) : (
              visible.map((m) => (
                <MessageRow key={m._id} message={m} active={m._id === selectedId} onSelect={open} />
              ))
            )}
          </div>
        </div>

        {/* ── Detail pane: right-hand column on desktop, full-screen sheet on mobile ── */}
        <div
          className={`flex-col overflow-hidden border-white/[0.08] bg-[#111114] sm:flex sm:min-w-0 sm:flex-1 sm:rounded-2xl sm:border ${
            selected ? "fixed inset-0 z-30 flex sm:relative sm:inset-auto" : "hidden"
          }`}
        >
          {selected ? (
            <MessageDetail
              message={selected}
              busy={busy}
              onBack={() => setSelectedId(null)}
              onResolve={toggleResolved}
              onDelete={remove}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <Inbox size={20} className="text-white/30" />
              </span>
              <p className="text-sm font-bold text-white/60">Nothing selected</p>
              <p className="mt-1 max-w-xs text-sm text-white/30">
                Pick a message on the left to read it. Opening one marks it as read automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
