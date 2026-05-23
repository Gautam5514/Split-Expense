"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import { 
  Loader2, Save, Camera, User, Mail, Phone, MapPin, 
  Globe, Briefcase, Quote, CheckCircle2, BellRing, Send, AlertCircle
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20">
      {/* Decorative Header Background */}
      <div className="h-48 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Profile Header Section */}
            <div className="p-8 pb-0 flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="relative group">
                <div className="w-36 h-36 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100">
                  {profile.profileImage?.url ? (
                    <img src={profile.profileImage.url} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-slate-200 dark:bg-slate-800 text-slate-400">
                      <User size={60} />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="profileImageInput" 
                  className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform active:scale-95"
                >
                  <Camera size={20} />
                  <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="flex-1 text-center md:text-left mb-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                  {profile.name || "Set your name"}
                  {profile.name && <CheckCircle2 className="text-blue-500" size={20} />}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-1.5 mt-1">
                  <Mail size={16} /> {profile.email}
                </p>
              </div>

              <div className="pb-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-2xl hover:opacity-90 transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={20} />}
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <hr className="my-8 mx-8 border-slate-100 dark:border-slate-800" />

            {/* Form Content */}
            <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Contact & Location */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Contact & Location</h3>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Professional Info</h3>
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
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Bio / Quote</label>
                    <div className="relative">
                      <Quote className="absolute top-3 left-3 text-slate-400" size={18} />
                      <textarea
                        name="bio"
                        rows={3}
                        value={profile.bio || ""}
                        onChange={handleChange}
                        placeholder="Write something about yourself..."
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* ── Web Push Notification Settings ── */}
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
          <div className="relative overflow-hidden border-b border-slate-100 dark:border-slate-800 px-8 py-6">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-indigo-500/5" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/15">
                <BellRing size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Push Notifications</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive instant alerts about expenses, groups, and settlements even when offline.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Status Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-150 dark:border-slate-800/50">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Status</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    oneSignalPermission === "granted" && oneSignalSubscriptionId
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                      : oneSignalPermission === "denied"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`} />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {oneSignalPermission === "granted" && oneSignalSubscriptionId
                      ? "Active & Subscribed"
                      : oneSignalPermission === "denied"
                      ? "Blocked / Denied by Browser"
                      : "Not Enabled"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Toggle Button */}
                {oneSignalPermission === "granted" && oneSignalSubscriptionId ? (
                  <button
                    type="button"
                    onClick={disableOneSignalNotifications}
                    className="px-6 py-2.5 border border-rose-500/20 text-rose-500 dark:text-rose-400 font-semibold rounded-xl hover:bg-rose-500/10 transition-all text-sm active:scale-95 duration-200 cursor-pointer"
                  >
                    Disable Notifications
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={requestOneSignalPermission}
                    disabled={oneSignalPermission === "denied"}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all text-sm shadow-lg hover:shadow-violet-500/20 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {oneSignalPermission === "denied" ? "Permission Blocked" : "Enable Push Notifications"}
                  </button>
                )}

                {/* Send Test Push Button */}
                <button
                  type="button"
                  onClick={sendTestPushNotification}
                  disabled={!oneSignalSubscriptionId}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm shadow-md active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send size={15} />
                  Send Test Push
                </button>
              </div>
            </div>

            {oneSignalError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/50 text-amber-750 dark:text-amber-300 text-xs animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">OneSignal Environment Notice</p>
                  <p>
                    OneSignal is configured to run on <strong>https://split-expense-vert.vercel.app</strong>. If you are currently testing on <strong>localhost</strong>, please verify that you have enabled <strong>Local Testing</strong> inside your OneSignal dashboard settings. Push features are bypassed on non-local development servers to avoid browser security origin crashes.
                  </p>
                </div>
              </div>
            )}

            {/* Instruction helper */}
            {oneSignalPermission === "denied" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 text-rose-700 dark:text-rose-300 text-xs animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Notifications are blocked</p>
                  <p>
                    You have blocked notifications for this site. To enable them, click the lock icon next to the URL in your browser address bar and change the notification permission to "Allow".
                  </p>
                </div>
              </div>
            )}
            
            {oneSignalPermission !== "denied" && !oneSignalSubscriptionId && (
              <p className="text-xs text-slate-400 ml-1">
                💡 Setup takes a single click. When prompted, select "Allow" to authorize browser-level push alerts. Works even when the website is closed!
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* UI Helper Components with more "Cool" styling */
function Input({ label, icon, ...props }) {
  return (
    <div className="relative group">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <input
          {...props}
          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>
    </div>
  );
}

function Select({ label, icon, options, ...props }) {
  return (
    <div className="relative group">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-1 block">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <select
          {...props}
          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="dark:bg-slate-900">
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        </div>
      </div>
    </div>
  );
}