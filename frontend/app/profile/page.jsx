"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import {
  Briefcase, Camera, Check, CheckCircle2, Clock3, Loader2, Lock,
  MapPin, SquarePen, User, X,
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
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const coins = useCoins();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setFirebaseUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
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
  };

  const startEdit = () => {
    setForm({ ...profile });
    setIsEditing(true);
    setSaved(false);
  };

  const cancelEdit = () => {
    setForm({ ...profile });
    setIsEditing(false);
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
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Error saving profile");
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

  const completeness = useMemo(() => {
    const filled = COMPLETENESS_FIELDS.filter((k) => (profile[k] || "").toString().trim()).length;
    const withPhoto = filled + (profile.profileImage?.url ? 1 : 0);
    return Math.round((withPhoto / (COMPLETENESS_FIELDS.length + 1)) * 100);
  }, [profile]);

  if (loading) return <Loader3D message="Loading your personal profile..." />;

  const displayData = isEditing ? form : profile;
  // Uploaded photo wins, then the saved avatar, then the Google/Firebase photo.
  const avatarUrl = profile.profileImage?.url || profile.avatar || firebaseUser?.photoURL;
  const chips = [
    profile.city && { icon: MapPin, text: [profile.city, profile.state].filter(Boolean).join(", ") },
    profile.profession && { icon: Briefcase, text: profile.profession },
    profile.timezone && { icon: Clock3, text: profile.timezone },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information</p>
        </div>

        {/* Identity card: gradient cover, overlapping avatar, chips, completeness */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="relative h-24 sm:h-28 bg-gradient-to-r from-cyan-600 via-teal-500 to-sky-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
          </div>

          <div className="px-4 sm:px-7 pb-5">
            <div className="flex items-end justify-between -mt-10 sm:-mt-12">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-4 ring-card shadow-lg bg-muted flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={36} className="text-muted-foreground/60" />
                  )}
                </div>
                <CoinBadge coins={coins} size="lg" className="-top-2 -right-2" />
                <label
                  htmlFor="profileImageInput"
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-foreground text-background rounded-xl flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                >
                  <Camera size={14} />
                  <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-xl px-3.5 py-2 hover:bg-cyan-500/10 transition cursor-pointer mb-1"
                >
                  <SquarePen size={13} /> Edit profile
                </button>
              )}
            </div>

            <div className="mt-3">
              <p className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">{profile.name || "Add your name"}</p>
              <p className="text-sm text-muted-foreground">{profile.email || "-"}</p>
            </div>

            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map(({ icon: Icon, text }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Icon size={11} className="text-cyan-600 dark:text-cyan-400" />
                    {text}
                  </span>
                ))}
              </div>
            )}

            {/* Completeness meter: a complete profile is a referral-reward milestone */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">Profile completeness</span>
                <span className={completeness === 100 ? "text-emerald-500" : "text-cyan-600 dark:text-cyan-400"}>
                  {completeness}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    completeness === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-600 to-teal-500"
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              {completeness < 100 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  A complete profile (mobile, city, bio) also unlocks referral rewards.
                </p>
              )}
            </div>
          </div>
        </div>

        <ReferralSection />

        {/* Personal info */}
        <form onSubmit={handleSave}>
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <User size={15} />
                </span>
                <h2 className="text-base font-bold text-foreground">Personal Information</h2>
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-1.5 hover:bg-muted transition cursor-pointer"
                >
                  <X size={13} /> Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" name="name" value={displayData.name || ""} onChange={handleChange} editing={isEditing} placeholder="Your full name" />
              <Field label="Email Address" name="email" value={profile.email || ""} onChange={() => {}} editing={false} locked placeholder="-" />
              <Field label="Mobile Number" name="mobile" value={displayData.mobile || ""} onChange={handleChange} editing={isEditing} placeholder="+91 98765 43210" />
              <Field label="City" name="city" value={displayData.city || ""} onChange={handleChange} editing={isEditing} placeholder="Mumbai" />
              <Field label="State" name="state" value={displayData.state || ""} onChange={handleChange} editing={isEditing} placeholder="Maharashtra" />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Timezone</label>
                {isEditing ? (
                  <select
                    name="timezone"
                    value={displayData.timezone || ""}
                    onChange={handleChange}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition appearance-none cursor-pointer"
                  >
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                ) : (
                  <ReadValue value={displayData.timezone} />
                )}
              </div>

              <Field label="Favorite Place" name="favoritePlace" value={displayData.favoritePlace || ""} onChange={handleChange} editing={isEditing} placeholder="e.g., The Local Coffee Shop" />
              <Field label="Profession" name="profession" value={displayData.profession || ""} onChange={handleChange} editing={isEditing} placeholder="Software Engineer" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  rows={3}
                  value={displayData.bio || ""}
                  onChange={handleChange}
                  placeholder="Write something about yourself..."
                  className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition resize-none"
                />
              ) : (
                <ReadValue value={displayData.bio} multiline />
              )}
            </div>

            {(saved || isEditing) && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                {saved && !isEditing && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} /> Profile updated successfully!
                  </span>
                )}
                {isEditing && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-bold rounded-xl transition disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ReadValue({ value, multiline = false }) {
  return (
    <div className={`px-3 py-2.5 text-sm text-foreground bg-muted/40 border border-border rounded-xl ${multiline ? "min-h-[72px] whitespace-pre-wrap" : "min-h-[42px]"}`}>
      {value || <span className="text-muted-foreground">-</span>}
    </div>
  );
}

function Field({ label, name, value, onChange, editing, placeholder, locked = false }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
        {label}
        {locked && <Lock size={11} className="text-muted-foreground/60" />}
      </label>
      {editing && !locked ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition"
        />
      ) : (
        <div className={`px-3 py-2.5 text-sm border rounded-xl min-h-[42px] ${locked ? "bg-muted/30 text-muted-foreground border-border/50 cursor-not-allowed" : "bg-muted/40 text-foreground border-border"}`}>
          {value || <span className="text-muted-foreground">-</span>}
        </div>
      )}
    </div>
  );
}
