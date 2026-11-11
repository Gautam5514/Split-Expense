"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ClipboardPaste, KeyRound } from "lucide-react";
import { normalizeInviteCode } from "@/lib/inviteCode";

import BrandLogo from "@/components/BrandLogo";
// Join a group by typing the 6-character code, or pasting the link or the whole
// invite message - the code is pulled out of whatever is pasted.
export default function JoinWithCodePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const go = (input = value) => {
    const code = normalizeInviteCode(input);
    if (!code) {
      setError("That doesn't look like an invite code. Codes are 6 letters and numbers, like K7M2QX.");
      return;
    }
    router.push(`/join/${encodeURIComponent(code)}?web=1`);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const code = normalizeInviteCode(text);
      setValue(code || text.trim().slice(0, 64));
      setError("");
      if (code) go(code);
    } catch {
      setError("Couldn't read the clipboard. Paste the code into the box instead.");
    }
  };

  // Show the 6-character code tidily as the user types; keep pasted links intact.
  const onChange = (e) => {
    const v = e.target.value;
    const compact = v.replace(/[\s-]/g, "").toUpperCase();
    setValue(/^[A-Z0-9]{0,6}$/.test(compact) ? compact : v);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrandLogo alt="" className="w-9 h-9 rounded-xl" />
          <span className="text-xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-brand)" }}>SplitEase</span>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); go(); }}
          className="rounded-3xl border border-border bg-card shadow-xl p-7 space-y-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <KeyRound size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Join with an invite code</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Enter the 6-character code from the group creator, or paste the invite link.
            </p>
          </div>

          <div>
            <label htmlFor="invite-code" className="sr-only">Invite code or link</label>
            <input
              id="invite-code"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={value}
              onChange={onChange}
              placeholder="K7M2QX"
              maxLength={300}
              className={`w-full rounded-xl border bg-background px-4 py-3.5 text-center text-2xl font-bold tracking-[0.35em] text-foreground placeholder:text-muted-foreground/40 placeholder:tracking-[0.35em] outline-none transition focus:ring-2 focus:ring-primary/40 ${error ? "border-destructive" : "border-border focus:border-primary"} ${value.length > 8 ? "text-sm tracking-normal font-medium" : ""}`}
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>

          <button type="submit" disabled={!value.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            Continue <ArrowRight size={16} />
          </button>
          <button type="button" onClick={pasteFromClipboard}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted cursor-pointer">
            <ClipboardPaste size={15} /> Paste from clipboard
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Got a link instead? Just open it. <Link href="/dashboard" className="text-primary hover:underline">Back to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
