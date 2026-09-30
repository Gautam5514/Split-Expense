"use client";
import { useEffect, useState } from "react";
import { X, Share2, Download, Loader2 } from "lucide-react";

export default function MediaLightbox({ url, onClose }) {
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!url) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [url, onClose]);

  if (!url) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      // Share the actual photo (not just a link) wherever the browser allows it.
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `splitease-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else if (navigator.share) {
        await navigator.share({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        title="Close"
      >
        <X size={20} />
      </button>

      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[78vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
      />

      <div className="mt-6 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition hover:bg-white/90 disabled:opacity-60"
        >
          {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          Share
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
        >
          <Download size={16} />
          Save
        </button>
      </div>
    </div>
  );
}
