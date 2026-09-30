"use client";
import { useState, useEffect, useRef } from "react";
import {
  X, Copy, Share2, Download, AlertCircle, Check, RefreshCw, Clock, ShieldCheck, MessageCircle, Link2, Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "@/lib/toast";
import { api } from "@/lib/api";
import { groupTypeMeta } from "@/lib/groupPresets";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";

const fmtDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

/**
 * Invite sheet: the 6-character code big and easy to read out, the link +
 * QR for sharing, and the safety info (expiry, approval, reset) at the bottom.
 */
// Centre badge: white rounded tile with a house glyph, in the brand teal.
const QR_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0891b2"/><path d="M6.5 11.2 12 6.5l5.5 4.7V17a.8.8 0 0 1-.8.8H14v-4h-4v4H7.3a.8.8 0 0 1-.8-.8z" fill="#fff"/></svg>'
);

export default function InviteModal({ groupId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { inviteCode, joinLink, expiresAt, joinApproval, groupName, groupType, memberCount }
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(null); // "code" | "link" | null
  const [resetting, setResetting] = useState(false);
  const qrWrapperRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;
    api.post(`/groups/${groupId}/invite`)
      .then((res) => setData(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.message || "";
        setErrorMsg(msg.includes("Only creator") ? "Only the group creator can share invites." : "Couldn't create an invite. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  const code = data?.inviteCode || "";
  const joinLink = data?.joinLink || "";
  const meta = groupTypeMeta(data?.groupType);
  const shareText = `Join "${data?.groupName || "my group"}" on SplitEase to split expenses. Code: ${code} - or tap: ${joinLink}`;

  const copy = async (what) => {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : joinLink);
      setCopied(what);
      toast.success(what === "code" ? "Code copied" : "Link copied");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Join my SplitEase group", text: shareText, url: joinLink });
      else await copy("link");
    } catch {
      // cancelled
    }
  };

  // New code + new expiry; the old code/link stop working immediately.
  const resetLink = async () => {
    if (!window.confirm("Make a new code? The current code and link will stop working.")) return;
    try {
      setResetting(true);
      const res = await api.post(`/groups/${groupId}/invite/reset`);
      setData((d) => ({ ...d, ...res.data }));
      toast.success("New code ready - the old one no longer works");
    } catch {
      toast.error("Couldn't reset the code");
    } finally {
      setResetting(false);
    }
  };

  // Visible SVG QR -> PNG download
  const downloadQR = () => {
    const svgEl = qrWrapperRef.current?.querySelector("svg");
    if (!svgEl) return;
    const SIZE = 512;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 32, 32, SIZE - 64, SIZE - 64);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `splitease-invite-${code}.png`;
      a.click();
    };
    img.src = url;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl border border-border bg-card text-foreground shadow-2xl"
        >
          <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

          {/* Header: which group */}
          <div className="flex items-center gap-3 px-5 pt-4 sm:pt-5 pb-4">
            <GroupTypeIcon type={data?.groupType} size={44} />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-tight truncate">
                Invite to {data?.groupName || "group"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data ? `${meta.label} · ${data.memberCount} member${data.memberCount !== 1 ? "s" : ""}` : "Share the code or link"}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer">
              <X size={17} />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-primary" size={26} />
              <p className="text-xs text-muted-foreground">Creating invite…</p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <AlertCircle size={24} className="text-amber-500" />
              <p className="text-sm font-semibold">Can&apos;t invite from here</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
            </div>
          )}

          {!loading && !errorMsg && data && (
            <div className="px-5 pb-5 space-y-5">
              {/* The code: big, spaced, tap to copy */}
              <div className="rounded-2xl bg-muted/50 border border-border px-4 pt-4 pb-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Invite code</p>
                <button type="button" onClick={() => copy("code")} aria-label={`Copy invite code ${code.split("").join(" ")}`}
                  className="mt-3 inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
                  {code.split("").map((ch, i) => (
                    <span key={i}
                      className={`w-10 h-12 sm:w-11 sm:h-14 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center font-mono text-2xl sm:text-[28px] font-bold text-foreground group-hover:border-primary/40 transition ${i === 2 ? "mr-2 sm:mr-3" : ""}`}>
                      {ch}
                    </span>
                  ))}
                </button>
                <div className="mt-3 flex items-center justify-center">
                  <button type="button" onClick={() => copy("code")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer">
                    {copied === "code" ? <Check size={13} /> : <Copy size={13} />}
                    {copied === "code" ? "Copied" : "Copy code"}
                  </button>
                </div>
              </div>

              {/* Link + QR */}
              <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                <div ref={qrWrapperRef} className="rounded-2xl p-[1.5px] bg-gradient-to-br from-primary/60 via-primary/15 to-primary/50 shadow-sm leading-none">
                  <div className="bg-white rounded-[14px] p-2">
                    <QRCodeSVG value={joinLink} size={96} bgColor="#ffffff" fgColor="#0b6b82" level="H" includeMargin={false}
                      imageSettings={{ src: QR_LOGO, width: 22, height: 22, excavate: true }} />
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Or share the link</p>
                  <button type="button" onClick={() => copy("link")}
                    className="w-full flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left hover:border-primary/40 transition cursor-pointer">
                    <Link2 size={14} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-xs font-mono text-muted-foreground">
                      {joinLink.replace(/^https?:\/\//, "")}
                    </span>
                    {copied === "link" ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="text-muted-foreground shrink-0" />}
                  </button>
                  <button type="button" onClick={downloadQR}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                    <Download size={13} /> Save QR
                  </button>
                </div>
              </div>

              {/* Share */}
              <div className="grid grid-cols-2 gap-2.5">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-[#25D366] hover:opacity-90 transition">
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <button type="button" onClick={share}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition cursor-pointer">
                  <Share2 size={16} /> Share
                </button>
              </div>

              {/* Safety */}
              <div className="border-t border-border pt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                {data.expiresAt && (
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> Expires {fmtDay.format(new Date(data.expiresAt))}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={12} /> {data.joinApproval ? "You approve each join" : "Anyone with the code can join"}
                </span>
                <button type="button" onClick={resetLink} disabled={resetting}
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-destructive/80 hover:text-destructive disabled:opacity-60 cursor-pointer">
                  <RefreshCw size={12} className={resetting ? "animate-spin" : ""} /> New code
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
