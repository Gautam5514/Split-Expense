"use client";
import { useState, useEffect, useRef } from "react";
import { X, Copy, Share2, Download, AlertCircle, Link2, QrCode, Check } from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "@/lib/toast";
import { api } from "@/lib/api";

export default function InviteModal({ groupId, token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;
    const fetchInvite = async () => {
      try {
        const res = await api.post(`/groups/${groupId}/invite`);
        const data = res.data;
        setInviteCode(data.inviteCode || "");
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setJoinLink(data.joinLink || `${origin}/join/${data.inviteCode}`);
      } catch (err) {
        const msg = err?.response?.data?.message || "";
        if (msg.includes("Only creator")) {
          setErrorMsg("Only the group creator can generate invite links. Ask the creator to share it.");
        } else {
          setErrorMsg("Failed to generate invite. Please try again.");
        }
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

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `splitease-invite-${inviteCode}.png`;
    a.click();
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
      // user cancelled share
    }
  };

  const displayLink = joinLink ? joinLink.replace(/^https?:\/\/[^/]+/, "") : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-sm overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl text-foreground max-h-[90dvh] overflow-y-auto"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 sm:px-6 sm:pt-6 border-b border-border bg-gradient-to-r from-cyan-500/5 to-teal-500/5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <QrCode size={16} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Invite to Group</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share the link or scan the QR code to join instantly.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                <p className="text-xs text-muted-foreground">Generating invite…</p>
              </div>
            ) : errorMsg ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertCircle size={22} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Access Restricted</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            ) : (
              <>
                {/* SVG QR shown to user */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-md ring-1 ring-border">
                    <QRCodeSVG
                      value={joinLink}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#0891b2"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Off-screen canvas for download — positioned outside viewport, not display:none */}
                <div style={{ position: "fixed", left: "-9999px", top: "-9999px", pointerEvents: "none" }}>
                  <QRCodeCanvas
                    ref={canvasRef}
                    value={joinLink}
                    size={512}
                    bgColor="#ffffff"
                    fgColor="#0891b2"
                    level="M"
                  />
                </div>

                {/* Invite code pill */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground">Code:</span>
                  <span className="font-mono font-bold text-sm tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                    {inviteCode}
                  </span>
                </div>

                {/* Link display */}
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2.5 border border-border">
                  <Link2 size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{displayLink}</span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition cursor-pointer"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={downloadQR}
                    className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer border border-border"
                  >
                    <Download size={15} />
                    Save QR
                  </button>
                  <button
                    onClick={shareInvite}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-95 text-white px-3 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer shadow-lg shadow-cyan-600/20"
                  >
                    <Share2 size={15} />
                    Share Link
                  </button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
                  Anyone with this link can join. Non-registered users will be prompted to sign up first.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
