"use client";
import { useState, useEffect } from "react";
import { X, Copy, Share2, Download } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api"; // ✅ use your configured axios instance

export default function InviteModal({ groupId, token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [joinLink, setJoinLink] = useState("");
  const [qrBase64, setQrBase64] = useState("");

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
        toast.error("Failed to generate invite");
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-[95%] max-w-sm text-center relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-2">Invite Friends</h2>
        <p className="text-gray-400 text-sm mb-4">
          Share this link or QR code to let others join your group instantly.
        </p>

        {loading ? (
          <p className="text-gray-500 text-sm">Generating...</p>
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
              <p className="text-gray-300 text-xs break-all bg-gray-800 p-2 rounded-lg">
                {joinLink}
              </p>
            </div>

            <div className="flex justify-center gap-3 mt-5">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm"
              >
                <Copy size={14} /> Copy
              </button>

              <button
                onClick={downloadQR}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm"
              >
                <Download size={14} /> QR
              </button>

              <button
                onClick={shareInvite}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm"
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
