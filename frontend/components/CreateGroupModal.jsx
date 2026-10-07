"use client";

import { useRef, useState, createElement } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import {
  X, Loader2, ChevronLeft, ChevronRight, Camera, Check,
  Link2, Copy, MessageCircle, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PeoplePicker from "@/components/people/PeoplePicker";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { addPeopleToGroup, describeAddResult, sharesToWeights } from "@/lib/people";
import ShareSplitEditor from "@/components/people/ShareSplitEditor";
import { resizeImage } from "@/lib/image";
import { GROUP_ICONS, getGroupIcon } from "@/lib/groupIcons";
import {
  GROUP_TYPES, PRIMARY_GROUP_TYPES, groupTypeMeta, suggestGroupName, CURRENCIES,
} from "@/lib/groupPresets";

// New groups are Roommates unless the user picks something else.
const DEFAULT_TYPE = "roommate";

const QUICK_ICONS = {
  roommate: ["home", "building2", "shoppingCart", "utensils", "coffee", "sparkles"],
  trip: ["plane", "mountain", "car", "treePine", "camera", "mapPin"],
  business: ["briefcase", "building2", "wallet", "trainFront", "coffee", "sparkles"],
  general: ["users", "partyPopper", "utensils", "gift", "gamepad2", "sparkles"],
};

/**
 * 3-step create-group wizard used by /dashboard:
 *   1. What's it for (Roommates / Trip / Business / Other)
 *   2. Name + photo/icon + type details (dates, budget, bill day...)
 *   3. Add people (known contacts by name, anyone else by full email -> invite) - skippable
 * then a "done" screen with the invite link.
 *
 * Props:
 *  - isOpen, onClose
 *  - onCreated: (createdGroup) => void - called when the user leaves the done screen
 */
export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [icon, setIcon] = useState(null);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [photo, setPhoto] = useState(null); // data URL
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "shares"
  const [shares, setShares] = useState({}); // { "me" | "u:<id>": number }
  const [selected, setSelected] = useState([]); // PeoplePicker items
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [joinLink, setJoinLink] = useState("");
  const fileRef = useRef(null);

  const meta = groupTypeMeta(type);

  if (!isOpen) return null;

  const reset = () => {
    setStep(0); setType(null); setName(""); setNameError(""); setIcon(null);
    setShowAllIcons(false); setPhoto(null); setStartDate(""); setEndDate("");
    setBudget(""); setCurrency("INR"); setReceiptRequired(false); setSplitMode("equal"); setShares({});
    setSelected([]); setCreating(false); setCreated(null); setJoinLink("");
  };

  const finish = () => {
    const group = created;
    reset();
    onClose?.();
    if (group) onCreated?.(group);
  };

  const handleClose = () => {
    if (creating) return;
    if (created) return finish();
    reset();
    onClose?.();
  };

  const pickType = (key) => {
    setType(key);
    setIcon(GROUP_TYPES[key].icon);
    if (!name.trim()) setName(suggestGroupName(key));
    setStep(1);
  };

  const validateDetails = () => {
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Group name is required."), false;
    if (trimmed.length < 2) return setNameError("Must be at least 2 characters."), false;
    if (trimmed.length > 100) return setNameError("Must be under 100 characters."), false;
    if (startDate && endDate && endDate < startDate) {
      toast.error("End date can't be before the start date.");
      return false;
    }
    if (budget && !(Number(budget) > 0)) {
      toast.error("Budget must be a positive amount.");
      return false;
    }
    setNameError("");
    return true;
  };

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image.");
    try {
      setPhoto(await resizeImage(f));
    } catch {
      toast.error("Couldn't read that image.");
    }
  };

  const handleCreate = async () => {
    if (!validateDetails()) return setStep(1);
    try {
      setCreating(true);
      const body = { name: name.trim(), groupType: type, icon: photo ? null : icon };
      if (type === "trip") {
        body.trip = { startDate: startDate || null, endDate: endDate || null, budget: budget || null };
      }
      if (type === "trip" || type === "business") body.settings = { currency };
      if (type === "business") body.settings = { ...body.settings, receiptRequired };
      // How expenses are split is decided here, once - not on every expense.
      if (splitMode === "shares") body.settings = { ...body.settings, defaultSplit: { type: "shares", weights: [] } };

      const res = await api.post("/groups", body);
      let group = res.data;

      // Members and photo go through their own endpoints; a failure there
      // shouldn't lose the group that was already created. They don't depend
      // on each other, so run them side by side instead of one after another.
      const [membersRes, photoRes] = await Promise.all([
        selected.length
          ? addPeopleToGroup(group._id, selected).then((r) => ({ r }), (err) => ({ err }))
          : null,
        photo
          ? api.post(`/groups/${group._id}/photo`, { file: photo }).then((r) => ({ r }), (err) => ({ err }))
          : null,
      ]);
      if (membersRes?.r) {
        if (membersRes.r.group) group = membersRes.r.group;
        toast.success(describeAddResult(membersRes.r));
      } else if (membersRes?.err) {
        toast.error(membersRes.err?.response?.data?.message || "Group created, but adding members failed.");
      }
      // Per-person shares: only possible once people are members, so patch after adding.
      if (splitMode === "shares" && Object.values(shares).some((v) => v !== 1)) {
        try {
          const weights = sharesToWeights(group, shares, group.createdBy?._id ?? group.createdBy);
          const r = await api.patch(`/groups/${group._id}/settings`, { settings: { defaultSplit: { type: "shares", weights } } });
          if (r.data) group = { ...group, ...r.data };
        } catch {
          toast.error("Group created, but shares weren't saved - set them in Group settings.");
        }
      }
      if (photoRes?.r) {
        if (photoRes.r.data?.group) group = { ...group, photo: photoRes.r.data.group.photo, icon: null };
      } else if (photoRes?.err) {
        toast.error("Group created, but the photo didn't upload.");
      }

      setCreated(group);
      setStep(3);
      api.post(`/groups/${group._id}/invite`).then((r) => setJoinLink(r.data?.joinLink || "")).catch(() => {});
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field === "name") { setNameError(data.message); setStep(1); }
      else toast.error(data?.message || "Error creating group");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const [gA, gB] = meta.accent;
  const AvatarIcon = getGroupIcon(icon) || meta.Icon;
  // One quiet input style everywhere: soft fill, no border, focus ring only.
  const field =
    "h-11 w-full rounded-xl bg-muted/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 border border-transparent focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition";
  const label = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
  const primaryBtn =
    "flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition disabled:opacity-60 cursor-pointer";
  const ghostBtn =
    "flex-1 h-11 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-60 cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] sm:p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="w-full sm:max-w-[420px] max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: back · title · progress · close */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-2">
          {step > 0 && step < 3 ? (
            <button type="button" onClick={() => setStep(step - 1)} disabled={creating}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition cursor-pointer"
              aria-label="Back">
              <ChevronLeft size={18} />
            </button>
          ) : <span className="w-2" />}
          <h2 className="flex-1 text-[15px] font-semibold text-foreground truncate">
            {step === 0 && "New group"}
            {step === 1 && `${meta.label} details`}
            {step === 2 && "Add people"}
            {step === 3 && "Group ready"}
          </h2>
          {step < 3 && (
            <div className="flex items-center gap-1 mr-2" aria-label={`Step ${step + 1} of 3`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-1 rounded-full transition-all ${i === step ? "w-4 bg-foreground" : i < step ? "w-1.5 bg-foreground/60" : "w-1.5 bg-border"}`} />
              ))}
            </div>
          )}
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
          <AnimatePresence mode="wait">
            {/* ── Step 1: type ── */}
            {step === 0 && (
              <motion.div key="type" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <p className="text-sm text-muted-foreground mb-3">What&apos;s this group for?</p>
                <div className="space-y-1.5">
                  {[...PRIMARY_GROUP_TYPES, "general"].map((key) => {
                    const t = key === "general" ? { ...GROUP_TYPES.general, label: "Something else" } : GROUP_TYPES[key];
                    const isDefault = key === DEFAULT_TYPE;
                    return (
                      <button key={key} type="button" onClick={() => pickType(key)}
                        className={`w-full flex items-center gap-3.5 p-2.5 rounded-2xl transition text-left cursor-pointer group ${
                          isDefault ? "bg-muted/60 ring-1 ring-inset ring-border" : "hover:bg-muted/60"}`}>
                        <GroupTypeIcon type={key} size={46} className="group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]" />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {t.label}
                            {isDefault && (
                              <span className="px-1.5 py-0.5 rounded-md bg-foreground text-background text-[10px] font-semibold leading-none">Default</span>
                            )}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">{t.tagline}</span>
                        </span>
                        <ChevronRight size={16} className="text-muted-foreground/60 group-hover:text-foreground transition" />
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => pickType(DEFAULT_TYPE)}
                  className="group/cta mt-5 w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition cursor-pointer">
                  Continue with {GROUP_TYPES[DEFAULT_TYPE].label}
                  <ArrowRight size={16} className="group-hover/cta:animate-[arrow-pulse_0.9s_ease-in-out_infinite]" />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: name, look, type details ── */}
            {step === 1 && (
              <motion.form key="details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                onSubmit={(e) => { e.preventDefault(); if (validateDetails()) setStep(2); }}
                className="space-y-5">
                {/* Photo/icon + name */}
                <div className="flex items-center gap-3.5">
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="relative w-14 h-14 rounded-2xl overflow-hidden cursor-pointer group/av"
                      style={photo ? undefined : { background: `linear-gradient(135deg, ${gA}, ${gB})` }}
                      aria-label={photo ? "Change photo" : "Add a photo"}>
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-white">
                          {createElement(AvatarIcon, { size: 24, strokeWidth: 2 })}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 group-hover/av:opacity-100 transition">
                        <Camera size={16} />
                      </span>
                    </button>
                    {photo && (
                      <button type="button" onClick={() => setPhoto(null)}
                        className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer">Remove</button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
                  <div className="flex-1 min-w-0">
                    <input autoFocus value={name} maxLength={100} placeholder={meta.namePlaceholder}
                      onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
                      aria-label="Group name"
                      className={`${field} text-[15px] font-medium ${nameError ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/15" : ""}`} />
                    {nameError ? <p className="text-destructive text-xs mt-1">{nameError}</p>
                      : !photo && <p className="text-[11px] text-muted-foreground mt-1">Tap the tile to add a photo</p>}
                  </div>
                </div>

                {/* Icon row */}
                {!photo && (
                  <div>
                    <p className={`${label} mb-2`}>Icon</p>
                    <div className="grid grid-cols-7 gap-1">
                      {(showAllIcons ? GROUP_ICONS.map((i) => i.key) : QUICK_ICONS[type]).map((key) => {
                        const I = getGroupIcon(key);
                        if (!I) return null;
                        const on = icon === key;
                        return (
                          <button key={key} type="button" onClick={() => setIcon(key)} aria-label={key} aria-pressed={on}
                            className={`aspect-square rounded-xl flex items-center justify-center transition cursor-pointer ${
                              on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                            <I size={17} />
                          </button>
                        );
                      })}
                      {!showAllIcons && (
                        <button type="button" onClick={() => setShowAllIcons(true)}
                          className="aspect-square rounded-xl flex items-center justify-center text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer">
                          More
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {type === "trip" && (
                  <>
                    <div>
                      <p className={`${label} mb-2`}>Dates <span className="normal-case tracking-normal">· optional</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} aria-label="Start date" />
                        <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={field} aria-label="End date" />
                      </div>
                    </div>
                    <div>
                      <p className={`${label} mb-2`}>Budget <span className="normal-case tracking-normal">· optional</span></p>
                      <div className="flex gap-2">
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency"
                          className="h-11 w-[84px] shrink-0 rounded-xl bg-muted/60 px-3 text-sm font-medium text-foreground border border-transparent focus:outline-none focus:border-primary/40 cursor-pointer">
                          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" inputMode="decimal" min="0" value={budget} placeholder="15,000"
                          onChange={(e) => setBudget(e.target.value)} className={`${field} flex-1 min-w-0`} aria-label="Budget" />
                      </div>
                    </div>
                  </>
                )}

                {type === "business" && (
                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span>
                        <span className="block text-sm font-medium text-foreground">Receipt required</span>
                        <span className="block text-xs text-muted-foreground">Every expense needs a bill photo</span>
                      </span>
                      <input type="checkbox" checked={receiptRequired} onChange={(e) => setReceiptRequired(e.target.checked)}
                        className="w-5 h-5 accent-cyan-600 cursor-pointer" />
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">Currency</span>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency"
                        className="h-10 w-[92px] rounded-xl bg-muted/60 px-3 text-sm font-medium text-foreground border border-transparent focus:outline-none focus:border-primary/40 cursor-pointer">
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex pt-1">
                  <button type="submit" className={primaryBtn}>
                    Next <ArrowRight size={15} />
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Step 3: people ── */}
            {step === 2 && (
              <motion.div key="people" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="space-y-5">
                <PeoplePicker selected={selected} onChange={setSelected} />

                {/* Split: asked only after people are added */}
                {selected.length > 0 && (
                <div>
                  <p className={`${label} mb-2`}>How do you split expenses?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "equal", title: "Equally", hint: "Everyone pays the same" },
                      { key: "shares", title: "By shares", hint: "e.g. bigger room = 2 shares" },
                    ].map((o) => (
                      <button key={o.key} type="button" onClick={() => setSplitMode(o.key)} aria-pressed={splitMode === o.key}
                        className={`text-left rounded-xl px-3.5 py-2.5 transition cursor-pointer ${
                          splitMode === o.key ? "bg-foreground text-background" : "bg-muted/60 text-foreground hover:bg-muted"}`}>
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className={`block text-[11px] mt-0.5 ${splitMode === o.key ? "text-background/70" : "text-muted-foreground"}`}>{o.hint}</span>
                      </button>
                    ))}
                  </div>
                  {splitMode === "shares" && (
                    <div className="mt-3"><ShareSplitEditor people={selected} shares={shares} onChange={setShares} /></div>
                  )}
                </div>
                )}

                <div className="flex items-center gap-2">
                  {!selected.length && (
                    <button type="button" onClick={handleCreate} disabled={creating} className={ghostBtn}>
                      Skip for now
                    </button>
                  )}
                  <button type="button" onClick={handleCreate} disabled={creating} className={primaryBtn}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={15} />}
                    {creating ? "Creating…" : selected.length ? `Create & add ${selected.length}` : "Create group"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Done: invite ── */}
            {step === 3 && created && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-2">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white overflow-hidden"
                  style={created.photo?.url ? undefined : { background: `linear-gradient(135deg, ${gA}, ${gB})` }}>
                  {created.photo?.url ? (
                    <img src={created.photo.url} alt="" className="w-full h-full object-cover" />
                  ) : createElement(getGroupIcon(created.icon) || meta.Icon, { size: 28, strokeWidth: 2 })}
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">{created.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meta.label} · {created.members?.length || 1} member{(created.members?.length || 1) !== 1 ? "s" : ""}
                </p>

                <div className="mt-6 text-left">
                  <p className={`${label} mb-2`}>Invite people</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={copyLink} disabled={!joinLink}
                      className="flex-1 min-w-0 h-11 flex items-center gap-2 rounded-xl bg-muted/60 px-3.5 text-left hover:bg-muted transition cursor-pointer disabled:opacity-60">
                      <Link2 size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-xs text-muted-foreground">
                        {joinLink ? joinLink.replace(/^https?:\/\//, "") : "Creating link…"}
                      </span>
                      <Copy size={14} className="text-muted-foreground shrink-0" />
                    </button>
                    <a href={joinLink ? `https://wa.me/?text=${encodeURIComponent(`Join "${created.name}" on SplitEase to split expenses: ${joinLink}`)}` : undefined}
                      target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"
                      className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-[#25D366] hover:opacity-90 transition ${joinLink ? "" : "pointer-events-none opacity-50"}`}>
                      <MessageCircle size={17} />
                    </a>
                  </div>
                </div>

                <div className="flex mt-6">
                  <button type="button" onClick={finish} className={primaryBtn}>
                    Open group <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
