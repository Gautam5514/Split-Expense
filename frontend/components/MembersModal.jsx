"use client";
import { useMemo, useState } from "react";
import { X, Search, UserPlus, QrCode, Users, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ── Full member roster: search + scroll + safe remove.
   Reached from the "Active Group Size" stat card on every breakpoint,
   since large groups outgrow a 4-avatar stack fast. ── */
export default function MembersModal({ group, isCreator, onClose, onAdd, onInvite, onRemove }) {
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const creatorId = String(group?.createdBy?._id || group?.createdBy || "");
  const members = useMemo(() => group?.members || [], [group]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [members, query]);

  const handleRemoveClick = (id) => {
    if (confirmId === id) {
      onRemove(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border/50 bg-card shadow-2xl text-foreground overflow-hidden flex flex-col"
          style={{ maxHeight: "85dvh" }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X size={17} />
          </button>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-0 sm:hidden shrink-0">
            <div className="w-9 h-1 rounded-full bg-border/60" />
          </div>

          {/* Header */}
          <div
            className="px-5 pt-3 pb-3 sm:px-6 sm:pt-5 border-b border-border/60 shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.06), rgba(20,184,166,0.04))" }}
          >
            <div className="flex items-center gap-2.5 pr-8">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Users size={15} className="text-cyan-500 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">
                  Members ({members.length})
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Everyone splitting costs in this group.
                </p>
              </div>
            </div>

            {/* Search - only worth showing once the list is long enough to need it */}
            {members.length > 5 && (
              <div className="mt-3 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-10 px-6 text-xs text-muted-foreground">
                No members match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((m) => {
                  const isMemberCreator = String(m._id) === creatorId;
                  const isConfirming = confirmId === m._id;
                  return (
                    <div key={m._id} className="flex items-center gap-3 px-5 py-3">
                      {m.photoURL ? (
                        <Image src={m.photoURL} alt={m.name || ""} width={36} height={36}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-border shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {m.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                          {m.name || "Unnamed"}
                          {isMemberCreator && <Crown size={11} className="text-primary shrink-0" />}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                      </div>

                      <div className="shrink-0">
                        {isMemberCreator ? (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/15">
                            OWNER
                          </span>
                        ) : isCreator ? (
                          isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRemoveClick(m._id)}
                                className="text-[10px] font-bold text-white bg-destructive hover:bg-destructive/90 px-2 py-1 rounded-lg transition cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => handleRemoveClick(m._id)}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/8 px-2 py-1 rounded-lg transition cursor-pointer"
                              title={`Remove ${m.name}`}>
                              Remove
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 space-y-2.5 border-t border-border shrink-0">
            {isCreator && (
              <button onClick={onInvite}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm shadow transition cursor-pointer">
                <QrCode size={15} /> Invite Friends (Link/QR)
              </button>
            )}
            {isCreator && (
              <button onClick={onAdd}
                className="w-full flex items-center justify-center gap-2 border border-border hover:bg-muted/50 text-foreground font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer">
                <UserPlus size={15} /> Add Group Member
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
