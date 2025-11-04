"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🟢 Fetch Profile
  useEffect(() => {
    if (!token) return;
    fetchProfile();
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

  // 🟡 Handle input change
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // 🟢 Save or update profile
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-gray-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-6">
      <div className="max-w-3xl mx-auto bg-gray-900/70 border border-gray-800 rounded-2xl p-8 shadow-lg shadow-emerald-600/10">
        <h1 className="text-2xl font-semibold mb-6 text-emerald-400">
          Your Profile
        </h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* 🧠 Profile Information Section */}
          {/* 🖼️ Profile Picture Upload */}
<div className="flex flex-col items-center mb-8">
  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500 shadow-lg shadow-emerald-600/20">
    {profile.profileImage?.url ? (
      <img
        src={profile.profileImage.url}
        alt="Profile"
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="flex items-center justify-center w-full h-full bg-gray-800 text-gray-500">
        <span className="text-4xl">👤</span>
      </div>
    )}
  </div>

  <div className="mt-3">
    <label
      htmlFor="profileImageInput"
      className="cursor-pointer text-sm text-emerald-400 hover:text-emerald-300"
    >
      Change Photo
    </label>
    <input
      id="profileImageInput"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Convert to base64
        const toBase64 = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
          });

        try {
          toast.loading("Uploading photo...");
          const base64 = await toBase64(file);

          const res = await api.post(
            "/profile/image",
            { file: base64 },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          setProfile({
            ...profile,
            profileImage: res.data.profileImage,
          });

          toast.dismiss();
          toast.success("Profile photo updated!");
        } catch (err) {
          toast.dismiss();
          toast.error("Failed to upload image");
          console.error(err);
        }
      }}
    />
  </div>
</div>

          <div className="space-y-8">
            {/* 🧍 User Basic Info */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-900/90 to-gray-800 border border-gray-700/70 rounded-2xl p-6 shadow-lg shadow-emerald-500/10">
              <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-5 h-5 text-emerald-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9A3.75 3.75 0 1 1 8.25 9a3.75 3.75 0 0 1 7.5 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 20.25a8.25 8.25 0 0 1 15 0v.75H4.5v-.75Z"
                  />
                </svg>
                Account Overview
              </h2>

              <div className="grid sm:grid-cols-2 gap-5 text-gray-300">
                <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                  <span className="flex-shrink-0 text-emerald-400 font-medium">
                    👤
                  </span>
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-base font-medium">{profile.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                  <span className="flex-shrink-0 text-emerald-400 font-medium">
                    📧
                  </span>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-base font-medium">{profile.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✍️ Editable Fields */}
            <div className="grid sm:grid-cols-2 gap-5">
              <Input
                label="Mobile Number"
                name="mobile"
                value={profile.mobile || ""}
                onChange={handleChange}
              />
              <Input
                label="City"
                name="city"
                value={profile.city || ""}
                onChange={handleChange}
              />
              <Input
                label="State"
                name="state"
                value={profile.state || ""}
                onChange={handleChange}
              />
              <Input
                label="Favorite Place"
                name="favoritePlace"
                value={profile.favoritePlace || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Profession"
              name="profession"
              value={profile.profession || ""}
              onChange={handleChange}
              options={[
                "Student",
                "Working Professional",
                "Freelancer",
                "Entrepreneur",
                "Other",
              ]}
            />
            <Input
              label="Timezone"
              name="timezone"
              value={profile.timezone || ""}
              onChange={handleChange}
            />
          </div>

          <Textarea
            label="Short Bio or Favorite Quote"
            name="bio"
            value={profile.bio || ""}
            onChange={handleChange}
            rows={3}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-lg transition font-medium"
            >
              {saving ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* 🧩 Small Reusable Components */
function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        {...props}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <textarea
        {...props}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
      />
    </div>
  );
}

function Select({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
