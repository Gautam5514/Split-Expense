"use client";

// A person in an Autopilot card: their real profile photo when we have one,
// otherwise the coloured initials. The directory (me + everyone I share a group
// with) loads once per page and is shared by every avatar on screen.
import { useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { PEOPLE_COLORS, initials } from "./format";

const EMPTY = { me: "", people: {}, byName: new Map() };
let directory = EMPTY;
let started = false;
const listeners = new Set();
const norm = (s) => String(s || "").trim().toLowerCase();

function load() {
  if (started) return;
  started = true;
  api.get("/agent/people", { timeout: 15000 }).then(({ data }) => {
    const people = data?.people || {};
    // Name lookup is only for cards that carry no id; a name two people share is never guessed.
    const byName = new Map();
    for (const [id, p] of Object.entries(people)) { const k = norm(p.name); byName.set(k, byName.has(k) ? null : id); }
    directory = { me: data?.me || "", people, byName };
    listeners.forEach((fn) => fn());
  }).catch(() => { started = false; }); // older server or a blip: initials stay, the next avatar retries
}
const subscribe = (fn) => { listeners.add(fn); load(); return () => listeners.delete(fn); };
const snapshot = () => directory;
const serverSnapshot = () => EMPTY;

/** Forget the directory (sign-out, tests). */
export const resetPeopleDirectory = () => { directory = EMPTY; started = false; };

/** The photo for a person, by id when the card has one, else by "You" or an unambiguous name. */
export function photoFor(dir, { id, name }) {
  if (id && dir.people[id]) return dir.people[id].photoUrl || null;
  if (id) return null; // a known id with no entry is someone outside my groups
  const key = norm(name);
  if (key === "you" || key === "me") return dir.people[dir.me]?.photoUrl || null;
  const match = dir.byName.get(key);
  return match ? dir.people[match]?.photoUrl || null : null;
}

export default function PersonAvatar({ id, name, index = 0, size = "h-7 w-7 text-[11px]" }) {
  const dir = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const url = photoFor(dir, { id, name });
  const [broken, setBroken] = useState(null); // the url that failed to load, if any
  if (url && broken !== url) {
    return <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(url)} className={`${size} shrink-0 rounded-full object-cover ring-1 ring-border`} />;
  }
  return <span className={`${size} ${PEOPLE_COLORS[index % PEOPLE_COLORS.length]} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>{initials(name)}</span>;
}
