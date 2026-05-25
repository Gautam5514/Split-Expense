"use client";
import { useState, useEffect } from "react";
import { X, Copy, Share2, Download, AlertCircle } from "lucide-react";
import toast from "@/lib/toast";
import { api } from "@/lib/api"; // ✅ use your configured axios instance

export default function InviteModal({ groupId, token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [joinLink, setJoinLink] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!groupId) return;

    const fetchInvite = async () => {
      try {
        const res = await api.post(`/groups/${groupId}/invite`);
        const data = res.data;

        if (!data.joinLink || !data.qrBase64) {
          throw new Error("Incomplete response from server");
        }

        setJoinLink(data.joinLink);
        setQrBase64(data.qrBase64);
      } catch (err) {
        console.error("fetchInvite error:", err);
        const errMsg = err?.response?.data?.message || err?.message || "Failed to generate invite";
        if (errMsg.includes("Only creator can generate invite")) {
          setErrorMsg("Only the creator of this group is authorized to generate invite links or QR codes. Since you are a member of this room, you are not able to invite friends.");
        } else {
          setErrorMsg("Failed to generate group invite details. Please try again later.");
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
    toast.success("Link copied to clipboard!");
  };

  const downloadQR = () => {
    if (!qrBase64) return;
    const a = document.createElement("a");
    a.href = qrBase64;
    a.download = "group-invite-qr.png";
    a.click();
  };

  const shareInvite = async () => {
    try {
      if (navigator.share && joinLink) {
        await navigator.share({
          title: "Join my SplitEase group 💸",
          text: "Hey! Join my trip group on SplitEase:",
          url: joinLink,
        });
      } else {
        await copyLink();
      }
    } catch (err) {
      console.error("shareInvite error:", err);
      toast.error("Unable to share");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 w-[95%] max-w-sm text-center relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-foreground mb-2">Invite Friends</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {errorMsg ? "Access Restricted" : "Share this link or QR code to let others join your group instantly."}
        </p>

        {loading ? (
          <p className="text-muted-foreground text-sm">Generating...</p>
        ) : errorMsg ? (
          <div className="py-6 space-y-4 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/15 shrink-0 shadow-sm animate-bounce">
              <AlertCircle size={22} />
            </div>
            <div className="space-y-1.5 text-center">
              <h4 className="text-sm font-bold text-foreground">Access Restricted</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs px-2">
                {errorMsg}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-3 rounded-xl mx-auto w-44 h-44 flex items-center justify-center">
              <img
                src={qrBase64}
                alt="Group QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4">
              <p className="text-muted-foreground text-xs break-all bg-muted p-2 rounded-lg">
                {joinLink}
              </p>
            </div>

            <div className="flex justify-center gap-3 mt-5">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded-lg text-sm cursor-pointer"
              >
                <Copy size={14} /> Copy
              </button>

              <button
                onClick={downloadQR}
                className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded-lg text-sm cursor-pointer"
              >
                <Download size={14} /> QR
              </button>

              <button
                onClick={shareInvite}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm cursor-pointer"
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
