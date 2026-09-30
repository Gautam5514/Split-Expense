"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Check, Plus, X, Loader2, Mail, ShieldCheck, UserRoundPlus } from "lucide-react";
import { api } from "@/lib/api";
import { EMAIL_RE } from "@/lib/people";

const PALETTE = ["#0891B2", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB"];
const tint = (name = "") => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

// Photo when it loads, the initial otherwise. Google profile photos need
// no-referrer, and any URL can 404 - never show a broken-image icon.
function Avatar({ name, photoURL, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (photoURL && !failed) {
    return (
      <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)}
        className="rounded-full object-cover shrink-0 bg-muted" style={style} />
    );
  }
  return (
    <span className="rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
      style={{ ...style, background: tint(name) }}>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function Row({ onClick, children, ...rest }) {
  return (
    <button type="button" onClick={onClick} {...rest}
      className="w-full flex items-center gap-3 px-2 py-2 -mx-2 rounded-xl hover:bg-muted/70 transition text-left cursor-pointer"
      style={{ width: "calc(100% + 1rem)" }}>
      {children}
    </button>
  );
}

/**
 * Safe "add people" picker.
 *  - Typing a name searches ONLY people you already know (shared group/chat).
 *  - Typing a full email looks up that one person (email shown masked);
 *    they get an invite to accept instead of being added directly.
 *  - An unknown email gets a joining email.
 *
 * Controlled: `selected` is [{ key, kind: "user"|"email", userId?, email?, name, sub, direct }].
 */
export default function PeoplePicker({ groupId, selected, onChange, autoFocus = true }) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState(null); // { status: "loading"|"found"|"none", user? }
  const reqId = useRef(0);

  const trimmed = query.trim();
  const isEmail = EMAIL_RE.test(trimmed);

  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get("/users/contacts", { params: { q: trimmed, excludeGroupId: groupId || undefined } });
        if (id === reqId.current) setContacts(res.data || []);
      } catch {
        if (id === reqId.current) setContacts([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [trimmed, groupId]);

  // Exact email that isn't one of my contacts -> one-person lookup.
  useEffect(() => {
    if (!isEmail) { setLookup(null); return; }
    const email = trimmed.toLowerCase();
    if (contacts.some((c) => c.email?.toLowerCase() === email)) { setLookup(null); return; }
    let cancelled = false;
    setLookup({ status: "loading" });
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/users/lookup", { params: { email } });
        if (!cancelled) setLookup(res.data?.found ? { status: "found", user: res.data.user } : { status: "none" });
      } catch (err) {
        if (!cancelled) setLookup({ status: "error", message: err?.response?.data?.message });
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isEmail, trimmed, contacts]);

  const isSelected = (key) => selected.some((s) => s.key === key);
  const toggle = (item) =>
    onChange(isSelected(item.key) ? selected.filter((s) => s.key !== item.key) : [...selected, item]);

  const contactItem = (u) => ({ key: `u:${u._id}`, kind: "user", userId: u._id, name: u.name, sub: u.email, direct: true, photoURL: u.photoURL });
  const addLookup = () => {
    if (lookup?.status === "found") {
      const u = lookup.user;
      const item = { key: `u:${u._id}`, kind: "user", userId: u._id, name: u.name, sub: u.maskedEmail || u.email, direct: !!u.isContact, photoURL: u.photoURL };
      if (!isSelected(item.key)) onChange([...selected, item]);
    } else {
      const email = trimmed.toLowerCase();
      const item = { key: `e:${email}`, kind: "email", email, name: email, sub: "Joining invite by email", direct: false };
      if (!isSelected(item.key)) onChange([...selected, item]);
    }
    setQuery("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); if (isEmail && lookup?.status !== "loading") addLookup(); }} className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, or a full email"
          autoFocus={autoFocus}
          aria-label="Search people"
          className="h-11 w-full rounded-xl bg-muted/60 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 border border-transparent focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition"
        />
        {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </form>

      {/* Selected */}
      {selected.length > 0 && (
        <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Adding ({selected.length})</p>
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <span key={s.key} className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full bg-muted text-xs font-medium text-foreground">
              <Avatar name={s.name} photoURL={s.photoURL} size={20} />
              <span className="max-w-[140px] truncate">{s.name}</span>
              {!s.direct && <span className="text-[10px] text-muted-foreground">invite</span>}
              <button type="button" onClick={() => onChange(selected.filter((x) => x.key !== s.key))}
                className="w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Remove ${s.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        </div>
      )}

      {/* Exact-email result */}
      {isEmail && lookup && (
        <div>
          {lookup.status === "loading" && <p className="text-xs text-muted-foreground flex items-center gap-2 px-0.5"><Loader2 size={12} className="animate-spin" /> Looking up…</p>}
          {lookup.status === "error" && <p className="text-xs text-destructive px-0.5">{lookup.message || "Couldn't look that up right now."}</p>}
          {lookup.status === "found" && (
            <Row onClick={addLookup}>
              <Avatar name={lookup.user.name} photoURL={lookup.user.photoURL} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">{lookup.user.name}</span>
                <span className="block text-xs text-muted-foreground truncate">{lookup.user.email}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                <UserRoundPlus size={14} /> {lookup.user.isContact ? "Add" : "Invite"}
              </span>
            </Row>
          )}
          {lookup.status === "none" && (
            <Row onClick={addLookup}>
              <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><Mail size={15} className="text-muted-foreground" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">{trimmed.toLowerCase()}</span>
                <span className="block text-xs text-muted-foreground">Send a joining invite by email</span>
              </span>
              <Plus size={15} className="text-primary shrink-0" />
            </Row>
          )}
        </div>
      )}

      {/* Known contacts */}
      {contacts.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{trimmed ? "Your contacts" : "People you know"}</p>
          <div className="max-h-60 overflow-y-auto">
            {contacts.map((u) => {
              const item = contactItem(u);
              const on = isSelected(item.key);
              return (
                <Row key={u._id} onClick={() => toggle(item)} role="checkbox" aria-checked={on}>
                  <Avatar name={u.name} photoURL={u.photoURL} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{u.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">{u.email}</span>
                  </span>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${on ? "bg-primary text-primary-foreground" : "ring-1 ring-inset ring-border"}`}>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </Row>
              );
            })}
          </div>
        </div>
      ) : (
        !loading && !isEmail && (
          <p className="text-xs text-muted-foreground px-0.5">
            {trimmed ? "No contact with that name. For someone new, type their full email." : "Type a full email to add someone new, or share the invite link after."}
          </p>
        )
      )}

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-0.5">
        <ShieldCheck size={12} className="shrink-0 mt-px" />
        New people get an invite and join only if they accept.
      </p>
    </div>
  );
}
