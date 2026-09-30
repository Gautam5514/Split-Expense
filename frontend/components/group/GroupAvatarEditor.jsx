"use client";

import { useRef, useState, createElement } from "react";
import { motion } from "framer-motion";
import { X, Camera, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { GROUP_ICONS, getGroupIcon } from "@/lib/groupIcons";
import { groupTypeMeta } from "@/lib/groupPresets";
import { resizeImage } from "@/lib/image";

/**
 * Group photo & icon (creator only). Minimal: the avatar in the middle (tap
 * it to upload a photo), then every icon in one quiet grid. Each choice saves
 * immediately.
 */
export default function GroupAvatarEditor({ group, onClose, onChange }) {
  const meta = groupTypeMeta(group.groupType);
  const [busy, setBusy] = useState(null); // "photo" | "remove" | iconKey
  const fileRef = useRef(null);
  const photoUrl = group.photo?.url;
  const CurrentIcon = getGroupIcon(group.icon) || meta.Icon;

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.");
    try {
      setBusy("photo");
      const res = await api.post(`/groups/${group._id}/photo`, { file: await resizeImage(file) });
      onChange?.({ photo: res.data.group.photo, icon: null });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Photo upload failed");
    } finally {
      setBusy(null);
    }
  };

  // Removing the photo falls back to the type's icon, never a bare letter.
  const removePhoto = async () => {
    try {
      setBusy("remove");
      await api.delete(`/groups/${group._id}/photo`);
      const icon = meta.icon || null;
      if (icon) await api.put(`/groups/${group._id}/icon`, { icon });
      onChange?.({ photo: { url: "", public_id: "" }, icon });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove the photo");
    } finally {
      setBusy(null);
    }
  };

  const pickIcon = async (key) => {
    if (key === group.icon && !photoUrl) return;
    try {
      setBusy(key);
      await api.put(`/groups/${group._id}/icon`, { icon: key });
      onChange?.({ icon: key, photo: { url: "", public_id: "" } });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update the icon");
    } finally {
      setBusy(null);
    }
  };

  const photoBusy = busy === "photo" || busy === "remove";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] sm:p-4" onClick={() => !busy && onClose?.()}>
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[360px] max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card shadow-xl px-5 pt-5 pb-6"
      >
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer">
          <X size={16} />
        </button>

        {/* Avatar: tap to upload */}
        <div className="flex flex-col items-center pt-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy}
            aria-label={photoUrl ? "Change photo" : "Upload photo"}
            className="relative w-20 h-20 rounded-[22px] overflow-hidden flex items-center justify-center text-white cursor-pointer disabled:cursor-wait group/av"
            style={photoUrl ? undefined : { background: `linear-gradient(135deg, ${meta.accent[0]}, ${meta.accent[1]})` }}>
            {photoUrl
              ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              : createElement(CurrentIcon, { size: 32, strokeWidth: 2 })}
            <span className={`absolute inset-0 flex items-center justify-center bg-black/35 transition ${photoBusy ? "opacity-100" : "opacity-0 group-hover/av:opacity-100"}`}>
              {photoBusy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </span>
          </button>
          <p className="mt-3 text-sm font-semibold text-foreground truncate max-w-full">{group.name}</p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy}
              className="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50">
              {photoUrl ? "Change photo" : "Upload photo"}
            </button>
            {photoUrl && (
              <>
                <span className="text-border">•</span>
                <button type="button" onClick={removePhoto} disabled={!!busy}
                  className="font-medium text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-50">
                  Remove
                </button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} />
        </div>

        {/* Icons */}
        <p className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {photoUrl ? "Or use an icon" : "Icon"}
        </p>
        <div className="grid grid-cols-8 gap-1">
          {GROUP_ICONS.map(({ key, label, Icon }) => {
            const selected = !photoUrl && group.icon === key;
            return (
              <button key={key} type="button" onClick={() => pickIcon(key)} disabled={!!busy}
                title={label} aria-label={label} aria-pressed={selected}
                className={`aspect-square rounded-xl flex items-center justify-center transition cursor-pointer disabled:cursor-wait ${
                  selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {busy === key ? <Loader2 size={16} className="animate-spin" /> : <Icon size={17} strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
