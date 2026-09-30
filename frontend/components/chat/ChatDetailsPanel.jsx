"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Mail, Phone, MapPin, Briefcase, Calendar, ChevronDown, ChevronUp, Image as ImageIcon, X } from "lucide-react";

const getColorForName = (name) => {
  const colors = ["bg-teal-500", "bg-emerald-500", "bg-cyan-600", "bg-blue-600", "bg-cyan-700"];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
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

function Field({ icon: Icon, label, value, href }) {
  if (!value) return null;
  const content = (
    <span className="text-[13.5px] font-semibold text-foreground truncate">{value}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-muted-foreground">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-muted-foreground">{label}</span>
        {href ? (
          <a href={href} className="block truncate text-[13.5px] font-semibold text-primary hover:underline">
            {value}
          </a>
        ) : (
          content
        )}
      </span>
    </div>
  );
}

export default function ChatDetailsPanel({ activeFriend, onClose }) {
  const [contact, setContact] = useState(null);
  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
    if (!activeFriend?._id) return;
    setContact(null);
    api
      .get(`/chat/contact/${activeFriend._id}`)
      .then((res) => setContact(res.data))
      .catch(() => setContact(null));
  }, [activeFriend?._id]);

  useEffect(() => {
    if (!activeFriend?.email) return;
    setLoadingMedia(true);
    setMedia([]);
    api
      .post("/chat/conversation", { otherUserId: activeFriend._id, otherEmail: activeFriend.email })
      .then((convo) => api.get(`/chat/messages/${convo.data._id}`))
      .then((res) => {
        const images = (res.data || []).filter((m) => m.mediaType === "image" && m.mediaUrl);
        setMedia(images.reverse());
      })
      .catch(() => setMedia([]))
      .finally(() => setLoadingMedia(false));
  }, [activeFriend?.email]);

  if (!activeFriend) return null;

  const name = contact?.name || activeFriend.name;
  const avatar = contact?.imageUrl || activeFriend.imageUrl;

  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card custom-scrollbar lg:flex">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-[13px] font-bold text-foreground">Contact Details</span>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
        {avatar ? (
          <img src={avatar} alt={name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ${getColorForName(name)}`}>
            {name?.charAt(0) || "?"}
          </div>
        )}
        <h2 className="mt-3 text-[16px] font-bold text-foreground">{name}</h2>
        <p className="mt-1 max-w-[220px] text-[12.5px] leading-snug text-muted-foreground">
          {contact?.bio || contact?.profession || "SplitEase member"}
        </p>
      </div>

      <Section title="Contact Details">
        <Field icon={Mail} label="Email" value={contact?.email} href={contact?.email ? `mailto:${contact.email}` : undefined} />
        <Field icon={Phone} label="Mobile" value={contact?.mobile} href={contact?.mobile ? `tel:${contact.mobile}` : undefined} />
        <Field icon={MapPin} label="Location" value={contact?.city} />
        <Field icon={Briefcase} label="Profession" value={contact?.profession} />
        <Field
          icon={Calendar}
          label="Member since"
          value={
            contact?.memberSince
              ? new Date(contact.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
              : null
          }
        />
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
