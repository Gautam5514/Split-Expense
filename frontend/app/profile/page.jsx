"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import { 
  Loader2, Save, Camera, User, Mail, Phone, MapPin, 
  Globe, Briefcase, Quote, CheckCircle2, ArrowLeft, Pencil, X, Check,
  Lock, SquarePen
} from "lucide-react";
import Loader3D from "@/components/Loader3D";
import Link from "next/link";

const TIMEZONES = [
  "Pacific Time (PT)", "Mountain Time (MT)", "Central Time (CT)",
  "Eastern Time (ET)", "UTC", "India Standard Time (IST)",
  "Central European Time (CET)", "Japan Standard Time (JST)",
  "Australian Eastern Time (AET)",
];

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile]   = useState({});
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved]       = useState(false);

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

  if (loading) {
    return <Loader3D message="Loading your personal profile..." />;
  }

  const displayData = isEditing ? form : profile;

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information</p>
        </div>

        {/* Avatar card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 sm:p-8 flex flex-col items-center gap-2">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 dark:border-border shadow bg-muted flex items-center justify-center">
              {profile.profileImage?.url ? (
                <img src={profile.profileImage.url} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <User size={40} className="text-slate-400" />
              )}
            </div>
            <label
              htmlFor="profileImageInput"
              className="absolute bottom-0 right-0 w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center shadow cursor-pointer hover:scale-110 transition-transform"
            >
              <Camera size={13} />
              <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          <div className="text-center mt-1">
            <p className="text-lg font-bold text-foreground">{profile.name || "-"}</p>
            <p className="text-sm text-muted-foreground">{profile.email || "-"}</p>
          </div>
        </div>

        {/* Personal info card */}
        <form onSubmit={handleSave}>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-base font-bold text-foreground">Personal Information</h2>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 border border-cyan-500/30 rounded px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition cursor-pointer"
                >
                  <SquarePen size={13} /> Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition cursor-pointer"
                >
                  <X size={13} /> Cancel
                </button>
              )}
            </div>

            {/* 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full Name"
                name="name"
                value={displayData.name || ""}
                onChange={handleChange}
                editing={isEditing}
                placeholder="Your full name"
              />

              <Field
                label="Email Address"
                name="email"
                value={profile.email || ""}
                onChange={() => {}}
                editing={false}
                locked
                placeholder="-"
              />

              <Field
                label="Mobile Number"
                name="mobile"
                value={displayData.mobile || ""}
                onChange={handleChange}
                editing={isEditing}
                placeholder="+1 (555) 123-4567"
              />

              <Field
                label="City"
                name="city"
                value={displayData.city || ""}
                onChange={handleChange}
                editing={isEditing}
                placeholder="San Francisco"
              />

              <Field
                label="State"
                name="state"
                value={displayData.state || ""}
                onChange={handleChange}
                editing={isEditing}
                placeholder="CA"
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Timezone</label>
                {isEditing ? (
                  <select
                    name="timezone"
                    value={displayData.timezone || ""}
                    onChange={handleChange}
                    className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition appearance-none cursor-pointer"
                  >
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2.5 text-sm text-foreground bg-muted/60/50 border border-border rounded-lg min-h-[42px]">
                    {displayData.timezone || <span className="text-muted-foreground">-</span>}
                  </div>
                )}
              </div>

              <Field
                label="Favorite Place"
                name="favoritePlace"
                value={displayData.favoritePlace || ""}
                onChange={handleChange}
                editing={isEditing}
                placeholder="e.g., The Local Coffee Shop"
              />
            </div>

            {/* Profession - full width */}
            <Field
              label="Profession"
              name="profession"
              value={displayData.profession || ""}
              onChange={handleChange}
              editing={isEditing}
              placeholder="Software Engineer"
            />

            {/* Bio - full width */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  rows={3}
                  value={displayData.bio || ""}
                  onChange={handleChange}
                  placeholder="Write something about yourself..."
                  className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition resize-none"
                />
              ) : (
                <div className="px-3 py-2.5 text-sm text-foreground bg-muted/60/50 border border-border rounded-lg min-h-[72px] whitespace-pre-wrap">
                  {displayData.bio || <span className="text-muted-foreground">-</span>}
                </div>
              )}
            </div>

            {/* Footer row - success message + save button */}
            {(saved || isEditing) && (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                {saved && !isEditing && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                    Profile updated successfully!
                  </span>
                )}

                {isEditing && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-bold rounded-xl transition disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
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
          className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition"
        />
      ) : (
        <div className={`px-3 py-2.5 text-sm border rounded-lg min-h-[42px] ${locked ? "bg-muted/30 text-muted-foreground border-border/50 cursor-not-allowed" : "bg-muted/40 text-foreground border-border"}`}>
          {value || <span className="text-muted-foreground">-</span>}
        </div>
      )}
    </div>
  );
}
