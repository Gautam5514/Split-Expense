"use client";

import { useEffect, useState, createElement } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Ban, Loader2, MailOpen } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { groupTypeMeta } from "@/lib/groupPresets";
import { getGroupIcon } from "@/lib/groupIcons";

/**
 * Invites waiting for my answer. Nobody is put in a group without saying yes:
 * Join accepts, Decline ignores, the block button also stops that person
 * from inviting or finding me again.
 *
 * compact: dashboard card (renders nothing when empty).
 */
export default function PendingInvitesList({ compact = false, onChanged }) {
  const router = useRouter();
  const [invites, setInvites] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/invites").then((r) => setInvites(r.data || [])).catch(() => setInvites([]));
  useEffect(() => { load(); }, []);

  const respond = async (inv, action, block = false) => {
    try {
      setBusy(`${inv._id}:${action}${block ? ":block" : ""}`);
      if (action === "accept") {
        const r = await api.post(`/invites/${inv._id}/accept`);
        toast.success(`You joined "${inv.group.name}"`);
        onChanged?.();
        router.push(`/groups/${r.data.groupId}`);
        return;
      }
      await api.post(`/invites/${inv._id}/decline`, { block });
      toast.success(block ? `Declined and blocked ${inv.invitedBy?.name || "them"}` : "Invite declined");
      setInvites((list) => list.filter((i) => i._id !== inv._id && !(block && String(i.invitedBy?._id) === String(inv.invitedBy?._id))));
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
      load();
    } finally {
      setBusy(null);
    }
  };

  if (invites === null) {
    return compact ? null : <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }
  if (!invites.length) {
    if (compact) return null;
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3"><MailOpen className="text-primary" size={20} /></div>
        <p className="font-semibold text-foreground text-sm">No pending invites</p>
        <p className="text-xs text-muted-foreground mt-1">When someone invites you to a group, it shows up here.</p>
      </div>
    );
  }

  return (
    <div className={compact ? "rounded-2xl border border-primary/30 bg-primary/[0.03] overflow-hidden" : "space-y-3"}>
      {compact && (
        <p className="px-4 pt-3 pb-1 text-xs font-bold text-foreground">Group invites ({invites.length})</p>
      )}
      {invites.map((inv) => {
        const meta = groupTypeMeta(inv.group.groupType);
        const Icon = getGroupIcon(inv.group.icon) || meta.Icon;
        return (
          <div key={inv._id} className={compact ? "px-4 py-3 border-t border-border/60 first:border-t-0" : "bg-card border border-border rounded-2xl p-4 shadow-sm"}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden"
                style={inv.group.photo?.url ? undefined : { background: `linear-gradient(135deg, ${meta.accent[0]}, ${meta.accent[1]})` }}>
                {inv.group.photo?.url
                  ? <img src={inv.group.photo.url} alt="" className="w-full h-full object-cover" />
                  : createElement(Icon, { size: 18 })}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{inv.group.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {inv.invitedBy?.name || "Someone"} ({inv.invitedBy?.email}) · {meta.label} · {inv.group.memberCount} member{inv.group.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" disabled={!!busy} onClick={() => respond(inv, "accept")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60 cursor-pointer">
                {busy === `${inv._id}:accept` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Join
              </button>
              <button type="button" disabled={!!busy} onClick={() => respond(inv, "decline")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60 cursor-pointer">
                <X size={13} /> Decline
              </button>
              <button type="button" disabled={!!busy} onClick={() => respond(inv, "decline", true)} title="Decline and block this person"
                aria-label="Decline and block"
                className="px-3 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-60 cursor-pointer">
                <Ban size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
