"use client";
import { useState, useEffect, useRef } from "react";
import { X, Copy, Share2, Download, AlertCircle, Link2, QrCode, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "@/lib/toast";
import { api } from "@/lib/api";

export default function InviteModal({ groupId, onClose }) {
  const [loading, setLoading]       = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [joinLink, setJoinLink]     = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [copied, setCopied]         = useState(false);
  const qrWrapperRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;
    const fetchInvite = async () => {
      try {
        const res = await api.post(`/groups/${groupId}/invite`);
        const data = res.data;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const link = data.joinLink || `${origin}/join/${data.inviteCode}`;
        // Extract code from the link as fallback if inviteCode is missing from response
        const code = data.inviteCode || link.split("/join/").pop().split("?")[0] || "";
        setInviteCode(code);
        setJoinLink(link);
      } catch (err) {
        const msg = err?.response?.data?.message || "";
        setErrorMsg(
          msg.includes("Only creator")
            ? "Only the group creator can generate invite links."
            : "Failed to generate invite. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [groupId]);

  const copyLink = async () => {
    if (!joinLink) return;
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert visible SVG QR → PNG download (no hidden canvas needed)
  const downloadQR = () => {
    const svgEl = qrWrapperRef.current?.querySelector("svg");
    if (!svgEl) return;
    const SIZE = 512;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `splitease-invite-${inviteCode}.png`;
      a.click();
    };
    img.src = url;
  };

  const shareInvite = async () => {
    try {
      if (navigator.share && joinLink) {
        await navigator.share({
          title: "Join my SplitEase group",
          text: "Hey! Join my group on SplitEase to split expenses:",
          url: joinLink,
        });
      } else {
        await copyLink();
      }
    } catch {
      // user cancelled
    }
  };

  const displayLink = joinLink ? joinLink.replace(/^https?:\/\/[^/]+/, "") : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border/50 bg-card shadow-2xl text-foreground overflow-hidden"
          style={{ maxHeight: "90dvh" }}
        >
          {/* Close - absolute so it doesn't push layout */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X size={17} />
          </button>

          {/* Full scrollable area */}
          <div className="overflow-y-auto overscroll-contain h-full" style={{ maxHeight: "90dvh" }}>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-9 h-1 rounded-full bg-border/60" />
            </div>

            {/* Header */}
            <div
              className="px-5 pt-3 pb-3 sm:px-6 sm:pt-5 border-b border-border/60"
              style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.06), rgba(20,184,166,0.04))" }}
            >
              <div className="flex items-center gap-2.5 pr-8">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <QrCode size={15} className="text-cyan-500 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">Invite to Group</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Scan QR or share the link to join instantly.</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                  <p className="text-xs text-muted-foreground">Generating invite…</p>
                </div>
              )}

              {/* Error */}
              {!loading && errorMsg && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <AlertCircle size={22} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Access Restricted</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* Main content */}
              {!loading && !errorMsg && joinLink && (
                <>
                  {/* QR - fixed wrapper so the SVG can never stretch beyond this box */}
                  <div className="flex justify-center">
                    <div
                      ref={qrWrapperRef}
                      className="bg-white rounded-2xl shadow-md ring-1 ring-black/5"
                      style={{ width: 164, height: 164, padding: 10, flexShrink: 0, lineHeight: 0 }}
                    >
                      <QRCodeSVG
                        value={joinLink}
                        size={144}
                        bgColor="#ffffff"
                        fgColor="#0891b2"
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Invite code */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Code:</span>
                    <span className="font-mono font-bold text-sm tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                      {inviteCode}
                    </span>
                  </div>

                  {/* Link */}
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-border bg-muted/60">
                    <Link2 size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground font-mono flex-1 truncate min-w-0">
                      {displayLink}
                    </span>
                    <button
                      onClick={copyLink}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition cursor-pointer"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={downloadQR}
                      className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/70 text-foreground px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer border border-border"
                    >
                      <Download size={14} />
                      Save QR
                    </button>
                    <button
                      onClick={shareInvite}
                      className="flex items-center justify-center gap-2 text-white px-3 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
                      style={{ background: "linear-gradient(135deg,#0891B2,#14b8a6)", boxShadow: "0 4px 14px rgba(8,145,178,0.25)" }}
                    >
                      <Share2 size={14} />
                      Share Link
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed pb-1">
                    Anyone with this link can join. Non-registered users will be asked to sign up first.
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
