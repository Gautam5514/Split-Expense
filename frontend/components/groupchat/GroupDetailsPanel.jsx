"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import GroupAvatar from "./GroupAvatar";
import GroupIconPicker from "@/components/GroupIconPicker";
import {
  Copy,
  Calendar,
  Tag,
  Crown,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
  Pencil,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

const getColorForName = (name) => {
  const colors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-emerald-500 to-green-600",
    "bg-gradient-to-br from-teal-500 to-teal-700",
    "bg-gradient-to-br from-cyan-500 to-teal-600",
    "bg-gradient-to-br from-sky-500 to-cyan-600",
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const GROUP_TYPE_LABELS = {
  trip: "Trip",
  roommate: "Roommates",
  general: "General",
};

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border px-5 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13px] font-bold text-foreground">{title}</span>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ icon: Icon, label, value, mono, onCopy }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-muted-foreground">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className={`block truncate text-[13.5px] font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
      </span>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
          title="Copy"
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}

export default function GroupDetailsPanel({ activeGroup, onClose, onUpdated }) {
  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [me, setMe] = useState(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarTab, setAvatarTab] = useState("icon");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get("/users/me").then((res) => setMe(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeGroup?._id) return;
    setLoadingMedia(true);
    setMedia([]);
    setEditingAvatar(false);
    api
      .get(`/groups/${activeGroup._id}/messages`)
      .then((res) => {
        const images = (res.data || []).filter((m) => m.mediaType === "image" && m.mediaUrl);
        setMedia(images.reverse());
      })
      .catch(() => setMedia([]))
      .finally(() => setLoadingMedia(false));
  }, [activeGroup?._id]);

  if (!activeGroup) return null;

  const creatorId = String(activeGroup.createdBy?._id || activeGroup.createdBy || "");
  const isCreator = !!me && String(me._id || me.id) === creatorId;

  const copy = (value, label) => {
    navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`)).catch(() => {});
  };

  const handlePickIcon = async (iconKey) => {
    setSavingAvatar(true);
    try {
      const res = await api.put(`/groups/${activeGroup._id}/icon`, { icon: iconKey });
      onUpdated?.(res.data.group);
      toast.success("Group icon updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update icon");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleUploadPhoto = async (file) => {
    if (!file.type?.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setSavingAvatar(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await api.post(`/groups/${activeGroup._id}/photo`, { file: base64 });
      onUpdated?.(res.data.group);
      toast.success("Group photo updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to upload photo");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSavingAvatar(true);
    try {
      const res = await api.delete(`/groups/${activeGroup._id}/photo`);
      onUpdated?.(res.data.group);
      toast.success("Photo removed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove photo");
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card custom-scrollbar lg:flex">
      <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl">
        <span className="text-[13px] font-bold text-foreground tracking-tight">Group Details</span>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="relative flex flex-col items-center px-5 pb-6 pt-7 text-center">
        {/* Ambient glow behind avatar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative">
          <span className="absolute -inset-1.5 rounded-full bg-primary/15 blur-lg" />
          <div className="relative">
            <GroupAvatar group={activeGroup} size={84} />
          </div>
          {isCreator && (
            <button
              type="button"
              onClick={() => setEditingAvatar((o) => !o)}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm transition hover:scale-105"
              title="Change group photo"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
        <h2 className="mt-4 text-[17px] font-bold tracking-tight text-foreground">{activeGroup.name}</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-[12px] font-medium text-muted-foreground">
          {GROUP_TYPE_LABELS[activeGroup.groupType] || "Group"} · {activeGroup.members?.length || 0} members
        </p>

        {isCreator && editingAvatar && (
          <div className="relative mt-4 w-full rounded-2xl border border-border bg-foreground/[0.02] p-3 text-left">
            <div className="mb-3 flex items-center gap-1 rounded-full bg-foreground/[0.05] p-1">
              <button
                type="button"
                onClick={() => setAvatarTab("icon")}
                className={`flex-1 rounded-full py-1.5 text-[12px] font-bold transition ${
                  avatarTab === "icon" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Choose icon
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab("photo")}
                className={`flex-1 rounded-full py-1.5 text-[12px] font-bold transition ${
                  avatarTab === "photo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Upload photo
              </button>
            </div>

            {avatarTab === "icon" ? (
              <GroupIconPicker value={activeGroup.icon} onChange={handlePickIcon} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPhoto(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={savingAvatar}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[12.5px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60"
                >
                  {savingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {savingAvatar ? "Uploading..." : "Choose an image"}
                </button>
                {activeGroup.photo?.url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={savingAvatar}
                    className="flex items-center gap-1.5 text-[11.5px] font-semibold text-destructive transition hover:underline disabled:opacity-60"
                  >
                    <Trash2 size={12} /> Remove current photo
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Section title="Group Info">
        <Field icon={Tag} label="Type" value={GROUP_TYPE_LABELS[activeGroup.groupType] || "General"} />
        <Field icon={Crown} label="Created by" value={activeGroup.createdBy?.name} />
        <Field
          icon={Calendar}
          label="Created on"
          value={activeGroup.createdAt ? new Date(activeGroup.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null}
        />
        {activeGroup.inviteCode && (
          <Field icon={Copy} label="Invite code" value={activeGroup.inviteCode} mono onCopy={() => copy(activeGroup.inviteCode, "Invite code")} />
        )}
      </Section>

      <Section title={`Members (${activeGroup.members?.length || 0})`}>
        <div className="space-y-1">
          {(activeGroup.members || []).map((member) => (
            <div key={member._id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/50">
              {member.photoURL ? (
                <img src={member.photoURL} alt={member.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5" />
              ) : (
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${getColorForName(member.name)}`}>
                  {member.name?.charAt(0)}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-foreground">{member.name}</span>
              </span>
              {String(member._id) === creatorId && (
                <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">Creator</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shared Media">
        {loadingMedia ? (
          <p className="text-[12.5px] text-muted-foreground">Loading...</p>
        ) : media.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {media.slice(0, 9).map((m) => (
              <a
                key={m._id}
                href={m.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img src={m.mediaUrl} alt="" className="h-full w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ImageIcon size={22} className="text-muted-foreground/50" />
            <p className="text-[12px] text-muted-foreground">No shared photos yet.</p>
          </div>
        )}
      </Section>
    </aside>
  );
}
