"use client";

import { useEffect, useState } from "react";
import { UserRoundCog, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";

// Who can add me to groups / find me by email, and who I've blocked.
export default function PrivacySettings() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/users/me/privacy").then((r) => setData(r.data)).catch(() => setData(null));
  }, []);

  const save = async (patch) => {
    const prev = data;
    setData({ ...data, ...patch });
    try {
      setSaving(true);
      const r = await api.patch("/users/me/privacy", patch);
      setData(r.data);
      toast.success("Privacy updated");
    } catch (err) {
      setData(prev);
      toast.error(err?.response?.data?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (u) => {
    try {
      await api.delete(`/users/${u._id}/block`);
      setData((d) => ({ ...d, blocked: d.blocked.filter((b) => b._id !== u._id) }));
      toast.success(`${u.name} unblocked`);
    } catch {
      toast.error("Couldn't unblock");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-border">
        <UserRoundCog size={16} className="text-slate-500" />
        <h2 className="text-base font-bold text-foreground">Groups &amp; Privacy</h2>
        {saving && <Loader2 size={13} className="animate-spin text-muted-foreground ml-auto" />}
      </div>

      {!data ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={18} /></div>
      ) : (
        <div className="divide-y divide-border">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Who can add me to a group</p>
            <div className="mt-2.5 space-y-2">
              {[
                { key: "contacts", title: "People I know add me directly", hint: "Anyone else sends an invite I accept or decline" },
                { key: "invite", title: "Always ask me first", hint: "Every group add is an invite" },
              ].map((o) => (
                <label key={o.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="addPolicy" checked={data.addPolicy === o.key} onChange={() => save({ addPolicy: o.key })}
                    className="mt-1 accent-cyan-600 cursor-pointer" />
                  <span>
                    <span className="block text-sm text-foreground">{o.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="px-5 py-4 flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="block text-sm font-semibold text-foreground">Let people find me by my email</span>
              <span className="block text-[11px] text-muted-foreground">Off = only people you already know, or an invite link, can reach you</span>
            </span>
            <input type="checkbox" checked={data.discoverableByEmail} onChange={(e) => save({ discoverableByEmail: e.target.checked })}
              className="w-5 h-5 accent-cyan-600 cursor-pointer shrink-0" />
          </label>

          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Blocked people</p>
            {data.blocked?.length ? (
              <div className="mt-2 divide-y divide-border">
                {data.blocked.map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground truncate">{u.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{u.email}</span>
                    </span>
                    <button type="button" onClick={() => unblock(u)}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0">Unblock</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">Nobody. Use the block button on an invite to stop someone.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
