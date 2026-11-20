"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Briefcase, Camera, Check, CheckCircle2, Clock3, Copy, Heart, Loader2, Lock,
  Mail, MapPin, Phone, Plus, QrCode, SquarePen, Trash2, Upload, User, Wallet, X,
} from "lucide-react";
import Loader3D from "@/components/Loader3D";
import ReferralSection from "@/components/profile/ReferralSection";
import { auth } from "@/lib/firebaseClient";
import CoinBadge from "@/components/CoinBadge";
import useCoins from "@/hooks/useCoins";
import TierBadge from "@/components/ui/TierBadge";

const TIMEZONES = [
  "Pacific Time (PT)", "Mountain Time (MT)", "Central Time (CT)",
  "Eastern Time (ET)", "UTC", "India Standard Time (IST)",
  "Central European Time (CET)", "Japan Standard Time (JST)",
  "Australian Eastern Time (AET)",
];

// Fields counted toward profile completeness (photo is counted separately).
const COMPLETENESS_FIELDS = ["name", "mobile", "city", "state", "timezone", "profession", "bio"];
// What each missing detail is called when we ask for it.
const FIELD_LABEL = { name: "Full name", mobile: "Mobile number", city: "City", state: "State", timezone: "Timezone", profession: "Profession", bio: "Bio", photo: "Photo" };
const rupees = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const coins = useCoins();
  const [eliteTier, setEliteTier] = useState(null);
  const [standing, setStanding] = useState(null); // { groups, owed, owe } once known
  const [focusField, setFocusField] = useState(null); // which field the editor opens on
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setFirebaseUser);
    return () => unsub();
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/profile");
      const data = res.data || {};
      setProfile(data);
      setForm(data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token, fetchProfile]);

  // Elite Club tier for the badge beside the name. Same request useCoins and
  // ReferralSection make, so lib/api shares the one network call.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.get("/referrals/me")
      .then((res) => alive && setEliteTier(res.data?.eliteClub?.tier?.key || null))
      .catch(() => {});
    return () => { alive = false; };
  }, [token]);

  // Where the user stands, shown beside their name. Nice to have: the page works without it.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.get("/balances/summary")
      .then((res) => alive && setStanding({ groups: Object.keys(res.data?.perGroup || {}).length, owed: res.data?.totalOwed || 0, owe: res.data?.totalOwe || 0 }))
      .catch(() => {});
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (!drawerOpen && !qrOpen) return;
    const onKey = (e) => { if (e.key === "Escape") { setQrOpen(false); if (drawerOpen) { setForm({ ...profile }); setDrawerOpen(false); } } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, qrOpen, profile]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const openEdit = (field = null) => {
    setFocusField(typeof field === "string" ? field : null);
    setForm({ ...profile });
    setDrawerOpen(true);
    setSaved(false);
  };

  const closeEdit = () => {
    setForm({ ...profile });
    setDrawerOpen(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put("/profile", form);
      const updated = { ...form, ...(res.data || {}) };
      setProfile(updated);
      setForm(updated);
      setDrawerOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const toBase64 = (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
    const id = toast.loading("Uploading photo...");
    try {
      const base64 = await toBase64(file);
      const res = await api.post("/profile/image", { file: base64 });
      const updated = { ...profile, profileImage: res.data.profileImage };
      setProfile(updated);
      setForm(updated);
      toast.success("Photo updated!", { id });
    } catch {
      toast.error("Upload failed", { id });
    }
  };

  const toBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQr(true);
    const id = toast.loading("Uploading UPI QR...");
    try {
      const base64 = await toBase64(file);
      const res = await api.post("/profile/upi-qr", { file: base64 });
      const updated = { ...profile, upiQr: res.data.upiQr };
      setProfile(updated);
      setForm((prev) => ({ ...prev, upiQr: res.data.upiQr }));
      toast.success("UPI QR saved!", { id });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed", { id });
    } finally {
      setUploadingQr(false);
      e.target.value = "";
    }
  };

  const handleQrRemove = async () => {
    const id = toast.loading("Removing UPI QR...");
    try {
      await api.delete("/profile/upi-qr");
      const updated = { ...profile, upiQr: { url: "", public_id: "" } };
      setProfile(updated);
      setForm((prev) => ({ ...prev, upiQr: { url: "", public_id: "" } }));
      toast.success("UPI QR removed", { id });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove", { id });
    }
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(profile.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select and copy it manually.");
    }
  };

  const completeness = useMemo(() => {
    const filled = COMPLETENESS_FIELDS.filter((k) => (profile[k] || "").toString().trim()).length;
    const withPhoto = filled + (profile.profileImage?.url ? 1 : 0);
    return Math.round((withPhoto / (COMPLETENESS_FIELDS.length + 1)) * 100);
  }, [profile]);

  if (loading) return <Loader3D message="Loading your personal profile..." />;

  // Uploaded photo wins, then the saved avatar, then the Google/Firebase photo.
  const avatarUrl = profile.profileImage?.url || profile.avatar || firebaseUser?.photoURL;
  const chips = [
    profile.city && { icon: MapPin, text: [profile.city, profile.state].filter(Boolean).join(", ") },
    profile.profession && { icon: Briefcase, text: profile.profession },
    profile.timezone && { icon: Clock3, text: profile.timezone },
  ].filter(Boolean);

  const missingFields = [
    ...(avatarUrl ? [] : ["photo"]),
    ...COMPLETENESS_FIELDS.filter((key) => !(profile[key] || "").toString().trim()),
  ];
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  const facts = [
    { key: "mobile", icon: Phone, label: "Mobile", value: profile.mobile },
    { key: "city", icon: MapPin, label: "Lives in", value: place },
    { key: "profession", icon: Briefcase, label: "Works as", value: profile.profession },
    { key: "timezone", icon: Clock3, label: "Timezone", value: profile.timezone },
    { key: "favoritePlace", icon: Heart, label: "Favourite place", value: profile.favoritePlace },
  ];
  const firstName = (profile.name || "").trim().split(/\s+/)[0];
  // The ring around the photo is the completeness meter.
  const RING = 2 * Math.PI * 62;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-28 sm:pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_15%_0%,rgba(20,184,166,.13),transparent_36%),radial-gradient(circle_at_85%_8%,rgba(56,189,248,.10),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10">

        {/* Identity: photo with its completeness ring, name, and where the user stands. */}
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(118deg,#052a33_0%,#0b5f70_52%,#12a594_100%)] text-white shadow-[0_34px_80px_-42px_rgba(8,145,178,.8)]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(115deg,black,transparent_62%)]" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-9 lg:p-11">
            <div className="relative h-[136px] w-[136px] shrink-0 self-start sm:self-center">
              <svg viewBox="0 0 136 136" className="absolute inset-0 -rotate-90" role="img" aria-label={`Profile ${completeness}% complete`}>
                <circle cx="68" cy="68" r="62" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="4" />
                <motion.circle cx="68" cy="68" r="62" fill="none" stroke={completeness === 100 ? "#6ee7b7" : "#ffffff"} strokeWidth="4" strokeLinecap="round" strokeDasharray={RING} initial={{ strokeDashoffset: RING }} animate={{ strokeDashoffset: RING - (RING * completeness) / 100 }} transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
              </svg>
              <div className="absolute inset-[10px] flex items-center justify-center overflow-hidden rounded-full bg-white/10">
                {avatarUrl ? (
                  <img src={avatarUrl} className="h-full w-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-4xl font-black text-white/80">{firstName ? firstName[0].toUpperCase() : <User size={40} />}</span>
                )}
              </div>
              <CoinBadge coins={coins} size="lg" className="-right-1 -top-1" />
              <label aria-label="Upload a new profile photo" htmlFor="profileImageInput" className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-cyan-950 shadow-lg transition-transform hover:scale-105 active:scale-95">
                <Camera size={15} />
                <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[28px] font-black leading-[1.1] tracking-[-0.035em] sm:text-4xl">
                <span className="min-w-0 break-words">{profile.name || "Add your name"}</span>
                <TierBadge tier={eliteTier} variant="solid" className="tracking-wide" />
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70"><Mail size={13} /> <span className="truncate">{profile.email || "-"}</span></p>
              {chips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {chips.map(({ icon: Icon, text }) => (
                    <span key={text} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                      <Icon size={11} className="text-cyan-200" />{text}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => openEdit()} className="flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white hover:text-cyan-950 sm:self-start">
              <SquarePen size={13} /> Edit profile
            </button>
          </div>

          {standing && (
            <dl className="relative grid grid-cols-3 border-t border-white/12 bg-black/10 backdrop-blur-sm">
              {[
                { label: standing.groups === 1 ? "Active group" : "Active groups", value: String(standing.groups), tone: "" },
                { label: "Owed to you", value: rupees(standing.owed), tone: "text-emerald-200" },
                { label: "You owe", value: rupees(standing.owe), tone: standing.owe > 0 ? "text-rose-200" : "" },
              ].map((item, k) => (
                <div key={item.label} className={`px-4 py-4 sm:px-9 ${k ? "border-l border-white/12" : ""}`}>
                  <dt className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{item.label}</dt>
                  <dd className={`mt-1 truncate text-lg font-black tracking-tight tabular-nums sm:text-2xl ${item.tone}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </motion.section>

        {saved && (
          <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400" role="status">
            <CheckCircle2 size={15} /> Profile updated
          </p>
        )}

        {/* What's missing, one tap each. Gone once the profile is complete. */}
        {missingFields.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-foreground">{completeness}% complete</span>
            {missingFields.slice(0, 5).map((key) => key === "photo" ? (
              <label key={key} htmlFor="profileImageInput" className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-teal-500 hover:text-foreground"><Plus size={12} />{FIELD_LABEL[key]}</label>
            ) : (
              <button key={key} type="button" onClick={() => openEdit(key)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-teal-500 hover:text-foreground"><Plus size={12} />{FIELD_LABEL[key]}</button>
            ))}
          </motion.div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* About: plain text and hairlines, no box. */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }} aria-label="About you">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">About</h2>
            {profile.bio ? (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-[17px] leading-8 text-foreground/90">{profile.bio}</p>
            ) : (
              <button type="button" onClick={() => openEdit("bio")} className="mt-3 text-left text-[17px] leading-8 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Say a line about yourself, so friends know it’s you.</button>
            )}
            <dl className="mt-6 divide-y divide-border/70 border-y border-border/70">
              {facts.map(({ key, icon: Icon, label, value }) => (
                <div key={key} className="flex items-center gap-3 py-3.5">
                  <Icon size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
                  <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {value || <button type="button" onClick={() => openEdit(key)} className="font-medium text-teal-700 hover:underline dark:text-teal-300">Add</button>}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.section>

          {/* Get paid: the one card on the page, styled like the thing it is. */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.22 }} aria-label="How friends pay you">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Get paid</h2>
            <div className="relative mt-3 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#0f172a_0%,#134e4a_70%,#0f766e_100%)] p-6 text-white shadow-[0_26px_60px_-36px_rgba(15,118,110,.9)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full border border-white/10" />
              <p className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55"><Wallet size={12} /> UPI</p>
              {profile.upiId ? (
                <div className="relative mt-5 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-mono text-lg font-semibold tracking-tight">{profile.upiId}</p>
                  <button type="button" onClick={copyUpi} aria-label="Copy UPI ID" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                    {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => openEdit("upiId")} className="relative mt-5 flex items-center gap-2 text-lg font-semibold text-white/85 underline-offset-4 hover:underline">Add your UPI ID <ArrowUpRight size={16} /></button>
              )}
              <p className="relative mt-1 text-xs text-white/55">{profile.upiId ? (copied ? "Copied" : "Friends use this to pay you back.") : "So friends can pay you back in one tap."}</p>

              <div className="relative mt-6 flex items-center gap-4 border-t border-white/12 pt-5">
                {profile.upiQr?.url ? (
                  <button type="button" onClick={() => setQrOpen(true)} aria-label="Show your UPI QR code" className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white p-1.5 transition hover:scale-[1.03]">
                    <img src={profile.upiQr.url} alt="" className="h-full w-full object-contain" />
                  </button>
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/25 text-white/40"><QrCode size={28} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{profile.upiQr?.url ? "Your QR code" : "Add a QR code"}</p>
                  <p className="mt-0.5 text-xs leading-5 text-white/55">{profile.upiQr?.url ? "Tap it to show it full size." : "A screenshot from any UPI app works."}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <label htmlFor="upiQrInputCard" className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold transition hover:bg-white/20 ${uploadingQr ? "pointer-events-none opacity-60" : ""}`}>
                      {uploadingQr ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}{profile.upiQr?.url ? "Replace" : "Upload"}
                      <input id="upiQrInputCard" type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploadingQr} />
                    </label>
                    {profile.upiQr?.url && <button type="button" onClick={handleQrRemove} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/60 transition hover:text-rose-200"><Trash2 size={12} />Remove</button>}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        <section className="mt-12 border-t border-border/70 pt-10">
          <ReferralSection />
        </section>
      </div>

      {/* The QR, big enough for a friend to scan off the screen. */}
      <AnimatePresence>
        {qrOpen && profile.upiQr?.url && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQrOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-label="Your UPI QR code">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-[2rem] bg-white p-5 text-center text-slate-900 shadow-2xl">
              <img src={profile.upiQr.url} alt="UPI QR code" className="mx-auto aspect-square w-full object-contain" />
              <p className="mt-3 text-sm font-bold">{profile.name || "Scan to pay"}</p>
              {profile.upiId && <p className="mt-0.5 font-mono text-xs text-slate-500">{profile.upiId}</p>}
              <button type="button" onClick={() => setQrOpen(false)} className="mt-4 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEdit}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            />
            <motion.form
              onSubmit={handleSave}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-2xl flex-col bg-card shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Edit</p>
                  <h2 className="mt-0.5 text-xl font-black tracking-[-0.03em] text-foreground">Personal information</h2>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  <Field focus={focusField} icon={User} label="Full Name" name="name" value={form.name || ""} onChange={handleChange} placeholder="Your full name" />
                  <Field icon={Mail} label="Email Address" value={profile.email || ""} onChange={() => {}} locked placeholder="-" />
                  <Field icon={Phone} label="Mobile Number" focus={focusField} name="mobile" value={form.mobile || ""} onChange={handleChange} placeholder="+91 98765 43210" />
                  <Field icon={Wallet} label="UPI ID (to receive payments)" focus={focusField} name="upiId" value={form.upiId || ""} onChange={handleChange} placeholder="name@okaxis" />
                  <Field icon={MapPin} label="City" focus={focusField} name="city" value={form.city || ""} onChange={handleChange} placeholder="Mumbai" />
                  <Field icon={MapPin} label="State" focus={focusField} name="state" value={form.state || ""} onChange={handleChange} placeholder="Maharashtra" />

                  <div className="flex flex-col gap-1.5 py-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Clock3 size={13} className="text-cyan-600 dark:text-cyan-400" /> Timezone</label>
                    <select
                      autoFocus={focusField === "timezone"}
                      name="timezone"
                      value={form.timezone || ""}
                      onChange={handleChange}
                      className="min-h-11 w-full appearance-none rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                    >
                      <option value="">Select timezone…</option>
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  <Field icon={Heart} label="Favorite Place" focus={focusField} name="favoritePlace" value={form.favoritePlace || ""} onChange={handleChange} placeholder="e.g., The Local Coffee Shop" />
                  <Field icon={Briefcase} label="Profession" focus={focusField} name="profession" value={form.profession || ""} onChange={handleChange} placeholder="Software Engineer" />
                </div>

                {/* UPI QR scanner upload — people who owe you scan this to pay */}
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <QrCode size={13} className="text-cyan-600 dark:text-cyan-400" /> UPI QR scanner
                    <span className="font-normal text-muted-foreground/70">(optional — friends scan it to pay you)</span>
                  </label>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                      {form.upiQr?.url ? (
                        <img src={form.upiQr.url} alt="UPI QR" className="h-full w-full object-contain" />
                      ) : (
                        <QrCode size={30} className="text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <label
                        htmlFor="upiQrInput"
                        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-300 ${uploadingQr ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {uploadingQr ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {form.upiQr?.url ? "Replace QR" : "Upload QR image"}
                        <input id="upiQrInput" type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploadingQr} />
                      </label>
                      {form.upiQr?.url && (
                        <button
                          type="button"
                          onClick={handleQrRemove}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-rose-400 hover:text-rose-500"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Open any UPI app → &quot;Receive money&quot; → screenshot your QR → upload it here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-1 border-t border-border pt-5">
                  <label className="text-xs font-bold text-muted-foreground">Bio</label>
                  <textarea
                    autoFocus={focusField === "bio"}
                    name="bio"
                    rows={4}
                    value={form.bio || ""}
                    onChange={handleChange}
                    placeholder="Write something about yourself..."
                    className="w-full resize-none rounded-xl border border-border bg-muted/35 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-cyan-500 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </motion.form>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ icon: Icon, label, name, value, onChange, placeholder, locked = false, focus = null }) {
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        {Icon && <Icon size={13} className="text-cyan-600 dark:text-cyan-400" />}{label}
        {locked && <Lock size={11} className="text-muted-foreground/60" />}
      </label>
      {locked ? (
        <div className="flex min-h-[42px] items-center rounded-xl bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
          {value || <span className="text-muted-foreground">-</span>}
        </div>
      ) : (
        <input
          type="text"
          autoFocus={!!name && focus === name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
        />
      )}
    </div>
  );
}
