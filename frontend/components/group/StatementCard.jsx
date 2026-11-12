"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Mail, RefreshCw, Send, Check, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";

const BATCH_LABEL = {
  scheduled: "Scheduled",
  sending: "Sending",
  done: "Sent to everyone",
  partial: "Sent to some members",
  failed: "Could not be sent",
  superseded: "Replaced by a newer statement",
  cancelled: "Cancelled",
};
const ACTIVE = ["scheduled", "sending"];

function Row({ r }) {
  const sent = r.status === "sent";
  const failed = r.status === "failed";
  const Icon = sent ? Check : failed ? AlertCircle : Clock;
  const tone = sent ? "text-emerald-500" : failed ? "text-red-500" : "text-muted-foreground";
  const label = sent ? "Sent" : failed ? "Failed" : r.status === "sending" ? "Sending" : "Queued";
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate text-foreground">{r.name}</span>
      <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${tone}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
    </li>
  );
}

// Settlement statement: download the PDF, see who got the email, and (creator
// only) send it again or retry the members it could not reach. The email itself
// is queued by the server when a group is completed or fully settled.
export default function StatementCard({ groupId, isCreator, reloadKey }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/report/status`);
      setStatus(data);
    } catch {
      setStatus((s) => s || { latest: null });
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const latest = status?.latest;
  const active = latest && ACTIVE.includes(latest.status);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [active, load]);

  const download = async () => {
    setBusy("pdf");
    try {
      const res = await api.get(`/groups/${groupId}/report.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const cd = res.headers?.["content-disposition"] || "";
      a.href = url;
      a.download = /filename="?([^";]+)"?/.exec(cd)?.[1] || "SplitEase-statement.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error("Could not generate the statement");
    } finally {
      setBusy("");
    }
  };

  const act = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.post(`/groups/${groupId}/report/${kind === "send" ? "send" : "retry"}`);
      toast.success(data?.message || "Done");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Something went wrong");
    } finally {
      setBusy("");
    }
  };

  const failedCount = latest?.recipients?.filter((r) => r.status === "failed").length || 0;
  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Mail className="h-4 w-4 text-primary" /> Settlement statement
        </h3>
        {latest && (
          <button onClick={load} aria-label="Refresh status" className="text-muted-foreground transition hover:text-foreground cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {latest
          ? `${BATCH_LABEL[latest.status] || latest.status}${latest.reason === "settled" ? " (all settled)" : latest.reason === "completed" ? " (group completed)" : ""}`
          : "Emailed to every member when the group is completed or fully settled."}
      </p>

      {latest?.recipients?.length > 0 && (
        <ul className="mt-3 divide-y divide-border/60">
          {latest.recipients.map((r) => <Row key={r.userId} r={r} />)}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={download} disabled={busy === "pdf"} className={btn}>
          <Download className="h-3.5 w-3.5" /> {busy === "pdf" ? "Preparing..." : "Download PDF"}
        </button>
        {isCreator && (
          <button onClick={() => act("send")} disabled={busy === "send" || active} className={btn}>
            <Send className="h-3.5 w-3.5" /> {latest ? "Send again" : "Email to everyone"}
          </button>
        )}
        {isCreator && failedCount > 0 && (
          <button onClick={() => act("retry")} disabled={busy === "retry"} className={btn}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry {failedCount} failed
          </button>
        )}
      </div>
    </div>
  );
}
