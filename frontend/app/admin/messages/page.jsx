"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2, CheckCircle2, Circle, Inbox } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, EmptyState, IconButton, LoadingBlock, PageHeader, StatusPill } from "@/components/admin/AdminUI";

const STATUS_TONE = { new: "cyan", read: "amber", resolved: "emerald" };

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/contact-messages");
      setMessages(data);
    } catch {
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      await adminApi.patch(`/admin/contact-messages/${id}`, { status });
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, status } : m)));
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this message permanently?")) return;
    setBusyId(id);
    try {
      await adminApi.delete(`/admin/contact-messages/${id}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      toast.success("Message deleted.");
    } catch {
      toast.error("Failed to delete message.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${messages.length} total`}
        title="Contact messages"
        description="Everything submitted through the Contact Us page."
      />

      {loading ? (
        <LoadingBlock />
      ) : messages.length === 0 ? (
        <EmptyState icon={Inbox} title="No messages yet" description="Submissions from the Contact Us page will appear here." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m._id} className="p-5 transition-colors hover:border-white/[0.14] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/25 to-cyan-600/10 text-[12px] font-extrabold text-cyan-300 ring-1 ring-white/[0.06]">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{m.name}</p>
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-cyan-300">
                      <Mail size={11} /> {m.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusPill tone={STATUS_TONE[m.status]}>{m.status}</StatusPill>
                  <span className="text-[11px] font-medium text-white/30">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[0.02] px-4 py-3 text-[13.5px] leading-relaxed text-white/70">
                {m.message}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {m.status !== "resolved" ? (
                  <button
                    disabled={busyId === m._id}
                    onClick={() => updateStatus(m._id, m.status === "new" ? "read" : "resolved")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    Mark as {m.status === "new" ? "read" : "resolved"}
                  </button>
                ) : (
                  <button
                    disabled={busyId === m._id}
                    onClick={() => updateStatus(m._id, "new")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    <Circle size={13} />
                    Reopen
                  </button>
                )}
                <IconButton icon={Trash2} tone="danger" disabled={busyId === m._id} onClick={() => remove(m._id)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
