"use client";

import { Check, X, Clock, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";

// Creator-only: invites waiting for an answer and join-by-link requests.
export default function PendingMembers({ groupId, pending, onChanged }) {
  const { invites = [], requests = [] } = pending || {};
  if (!invites.length && !requests.length) return null;

  const act = async (fn, okMsg) => {
    try {
      await fn();
      toast.success(okMsg);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const row = (r, actions) => (
    <div key={r._id} className="flex items-center gap-3 px-5 py-2.5">
      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {(r.user?.name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{r.user?.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{r.user?.email}</p>
      </div>
      {actions}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {requests.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5"><UserPlus size={14} className="text-primary" /> Join requests ({requests.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {requests.map((r) => row(r, (
              <div className="flex gap-1.5 shrink-0">
                <button type="button" title="Approve"
                  onClick={() => act(() => api.post(`/groups/${groupId}/invites/${r._id}/approve`), `${r.user?.name} added`)}
                  className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 cursor-pointer"><Check size={14} /></button>
                <button type="button" title="Reject"
                  onClick={() => act(() => api.delete(`/groups/${groupId}/invites/${r._id}`), "Request rejected")}
                  className="w-8 h-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-muted cursor-pointer"><X size={14} /></button>
              </div>
            )))}
          </div>
        </>
      )}
      {invites.length > 0 && (
        <>
          <div className={`px-5 py-3 border-b border-border ${requests.length ? "border-t" : ""}`}>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5"><Clock size={14} className="text-amber-500" /> Waiting to accept ({invites.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {invites.map((r) => row(r, (
              <button type="button"
                onClick={() => act(() => api.delete(`/groups/${groupId}/invites/${r._id}`), "Invite cancelled")}
                className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer shrink-0">
                Cancel
              </button>
            )))}
          </div>
        </>
      )}
    </div>
  );
}
