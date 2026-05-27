"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import { 
  Loader2, Save, Camera, User, Mail, Phone, MapPin, 
  Globe, Briefcase, Quote, CheckCircle2, BellRing, Send, AlertCircle, ArrowLeft
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import Link from "next/link";

export default function ProfilePage() {
  const { token } = useAuth();
  const { 
    oneSignalSubscriptionId, 
    oneSignalPermission, 
    oneSignalError,
    requestOneSignalPermission, 
    disableOneSignalNotifications, 
    sendTestPushNotification 
  } = useNotifications();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data || {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

    const loadingToast = toast.loading("Uploading photo...");
    try {
      const base64 = await toBase64(file);
      const res = await api.post(
        "/profile/image",
        { file: base64 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile({ ...profile, profileImage: res.data.profileImage });
      toast.success("Photo updated!", { id: loadingToast });
    } catch (err) {
      toast.error("Upload failed", { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
        <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground animate-pulse font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Ambient Blur Orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Navigation Head */}
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>

        {/* Headline Header */}
        <div className="flex items-start gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/15 shrink-0 shadow-sm">
            <User size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Personal Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
              Manage your personal metadata, profile photograph, location coordinates, and occupation info.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] shadow-sm p-6 sm:p-10 space-y-8">
            
            {/* Profile Header Section */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-2">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {profile.profileImage?.url ? (
                    <img src={profile.profileImage.url} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="profileImageInput" 
                  className="absolute bottom-1 right-1 p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform active:scale-95 border border-slate-200 dark:border-slate-700"
                >
                  <Camera size={16} />
                  <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="flex-1 text-center md:text-left mb-2 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                  {profile.name || "Set your name"}
                  {profile.name && <CheckCircle2 className="text-blue-500" size={20} />}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-1.5 font-medium">
                  <Mail size={15} /> {profile.email}
                </p>
              </div>

              <div className="pb-2 w-full md:w-auto">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs rounded-full hover:opacity-90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={14} />}
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Form Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              
              {/* Left Column: Contact & Location */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Contact & Location</h3>
                <div className="space-y-4">
                  <Input 
                    icon={<Phone size={18} />} 
                    label="Mobile Number" 
                    name="mobile" 
                    placeholder="+1 234 567 890" 
                    value={profile.mobile || ""} 
                    onChange={handleChange} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      icon={<MapPin size={18} />} 
                      label="City" 
                      name="city" 
                      placeholder="New York" 
                      value={profile.city || ""} 
                      onChange={handleChange} 
                    />
                    <Input 
                      icon={<Globe size={18} />} 
                      label="State" 
                      name="state" 
                      placeholder="NY" 
                      value={profile.state || ""} 
                      onChange={handleChange} 
                    />
                  </div>
                  <Input 
                    icon={<MapPin size={18} className="text-pink-500" />} 
                    label="Favorite Place" 
                    name="favoritePlace" 
                    placeholder="Santorini, Greece" 
                    value={profile.favoritePlace || ""} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              {/* Right Column: Professional & Bio */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Professional Info</h3>
                <div className="space-y-4">
                  <Select
                    icon={<Briefcase size={18} />}
                    label="Profession"
                    name="profession"
                    value={profile.profession || ""}
                    onChange={handleChange}
                    options={["Student", "Working Professional", "Freelancer", "Entrepreneur", "Other"]}
                  />
                  <Input 
                    icon={<Globe size={18} />} 
                    label="Timezone" 
                    name="timezone" 
                    placeholder="UTC+5:30" 
                    value={profile.timezone || ""} 
                    onChange={handleChange} 
                  />
                  <div className="relative group">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Bio / Quote</label>
                    <div className="relative">
                      <Quote className="absolute top-3.5 left-4 text-slate-400" size={16} />
                      <textarea
                        name="bio"
                        rows={3}
                        value={profile.bio || ""}
                        onChange={handleChange}
                        placeholder="Write something about yourself..."
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl pl-12 pr-5 py-3.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

/* UI Helper Components with fully rounded styling */
function Input({ label, icon, ...props }) {
  return (
    <div className="relative group">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <input
          {...props}
          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-5 py-3.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
        />
      </div>
    </div>
  );
}

function Select({ label, icon, options, ...props }) {
  return (
    <div className="relative group">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <select
          {...props}
          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-10 py-3.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none font-semibold cursor-pointer"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="dark:bg-slate-900">
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-4 pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        </div>
      </div>
    </div>
  );
}