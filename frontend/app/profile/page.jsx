"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase, Camera, Check, CheckCircle2, Clock3, Heart, Loader2, Lock,
  Mail, MapPin, Phone, QrCode, SquarePen, Trash2, Upload, User, Wallet, X,
} from "lucide-react";
import Loader3D from "@/components/Loader3D";
import ReferralSection from "@/components/profile/ReferralSection";
import { auth } from "@/lib/firebaseClient";
import CoinBadge from "@/components/CoinBadge";
import useCoins from "@/hooks/useCoins";

const TIMEZONES = [
  "Pacific Time (PT)", "Mountain Time (MT)", "Central Time (CT)",
  "Eastern Time (ET)", "UTC", "India Standard Time (IST)",
  "Central European Time (CET)", "Japan Standard Time (JST)",
  "Australian Eastern Time (AET)",
];

// Fields counted toward profile completeness (photo is counted separately).
const COMPLETENESS_FIELDS = ["name", "mobile", "city", "state", "timezone", "profession", "bio"];

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

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const openEdit = () => {
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

  const missingFields = COMPLETENESS_FIELDS.filter((key) => !(profile[key] || "").toString().trim());

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-28 sm:pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_12%,rgba(6,182,212,.11),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(45,212,191,.08),transparent_28%)]" />
      <div className="relative mx-auto max-w-[1440px]">
        <header className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Your profile</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Identity, preferences and rewards organized in one focused workspace.</p>
        </header>

        {/* Full-width identity band followed by a responsive editorial split. */}
        <section className="relative mx-3 overflow-hidden rounded-[2rem] bg-[linear-gradient(112deg,#062c36_0%,#0e7490_58%,#14b8a6_100%)] text-white shadow-[0_30px_80px_-38px_rgba(8,145,178,.75)] sm:mx-5 lg:mx-8">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_right,black,transparent)]" />
          <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:px-10 lg:py-12">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative w-fit self-start">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] border-4 border-white/80 bg-white/10 shadow-2xl sm:h-32 sm:w-32">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={36} className="text-muted-foreground/60" />
                  )}
                </div>
                <CoinBadge coins={coins} size="lg" className="-right-2 -top-2" />
                <label aria-label="Upload a new profile photo"
                  htmlFor="profileImageInput"
                  className="absolute -bottom-1.5 -right-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-cyan-950 shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Camera size={14} />
                  <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/70">SplitEase member</p>
                <p className="mt-2 text-2xl font-black leading-tight tracking-[-0.035em] lg:text-3xl">{profile.name || "Add your name"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70"><Mail size={13} /> {profile.email || "-"}</p>

                {chips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                    {chips.map(({ icon: Icon, text }) => (
                      <span key={text} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm">
                        <Icon size={11} className="text-cyan-200" />{text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 sm:ml-auto sm:self-start">
                <button
                  type="button"
                  onClick={openEdit}
                  className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-cyan-950"
                >
                  <SquarePen size={13} /> Edit profile
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-black/10 p-5 backdrop-blur-sm lg:p-6">
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Profile complete</span>
                <span className="text-4xl font-black tracking-[-0.06em] text-white">{completeness}<small className="ml-1 text-base text-cyan-100/60">%</small></span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${completeness === 100 ? "bg-emerald-300" : "bg-white"}`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              {completeness < 100 && (
                <p className="mt-3 text-[11px] leading-relaxed text-white/65">
                  Add {missingFields.slice(0, 3).map((field) => field === "name" ? "full name" : field).join(", ")} to unlock every reward.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7">
          {saved && (
            <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={15} /> Profile updated!
            </div>
          )}
          <aside className="min-w-0 rounded-[2rem] border border-border bg-card p-5 shadow-[0_22px_60px_-45px_rgba(8,145,178,.55)] sm:p-7 lg:p-8">
            <ReferralSection />
          </aside>
        </div>
      </div>

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
                  <Field icon={User} label="Full Name" name="name" value={form.name || ""} onChange={handleChange} placeholder="Your full name" />
                  <Field icon={Mail} label="Email Address" value={profile.email || ""} onChange={() => {}} locked placeholder="-" />
                  <Field icon={Phone} label="Mobile Number" name="mobile" value={form.mobile || ""} onChange={handleChange} placeholder="+91 98765 43210" />
                  <Field icon={Wallet} label="UPI ID (to receive payments)" name="upiId" value={form.upiId || ""} onChange={handleChange} placeholder="name@okaxis" />
                  <Field icon={MapPin} label="City" name="city" value={form.city || ""} onChange={handleChange} placeholder="Mumbai" />
                  <Field icon={MapPin} label="State" name="state" value={form.state || ""} onChange={handleChange} placeholder="Maharashtra" />

                  <div className="flex flex-col gap-1.5 py-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Clock3 size={13} className="text-cyan-600 dark:text-cyan-400" /> Timezone</label>
                    <select
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

                  <Field icon={Heart} label="Favorite Place" name="favoritePlace" value={form.favoritePlace || ""} onChange={handleChange} placeholder="e.g., The Local Coffee Shop" />
                  <Field icon={Briefcase} label="Profession" name="profession" value={form.profession || ""} onChange={handleChange} placeholder="Software Engineer" />
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

function Field({ icon: Icon, label, name, value, onChange, placeholder, locked = false }) {
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
