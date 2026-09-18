"use client";

/**
 * /mcp-login — premium token helper for the SplitEase MCP server.
 *
 * Two-panel layout: an AI-to-SplitEase illustration beside the token helper.
 * The token is a short-lived (~1h) credential shown only to the signed-in user;
 * this page never transmits it anywhere.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  onIdTokenChanged,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";
import toast from "@/lib/toast";
import {
  Mail,
  Lock,
  Loader2,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Bot,
} from "lucide-react";

/* Official multi-colour Google "G" mark. */
function GoogleIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const ease = [0.22, 1, 0.36, 1];

export default function McpLoginPage() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          setToken(await u.getIdToken());
        } catch {
          setToken("");
        }
      } else {
        setToken("");
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  const mapAuthError = (err) => {
    const code = err?.code || "";
    if (code.includes("wrong-password") || code.includes("invalid-credential"))
      return "Incorrect email or password.";
    if (code.includes("user-not-found")) return "No account exists for that email.";
    if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
    if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
    return err?.message || "Sign-in failed.";
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google.");
    } catch (err) {
      toast.error(mapAuthError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Signed in.");
    } catch (err) {
      toast.error(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const refreshToken = async () => {
    if (!user) return;
    setBusy(true);
    try {
      setToken(await user.getIdToken(true));
      toast.success("Fresh token generated.");
    } catch {
      toast.error("Could not refresh token.");
    } finally {
      setBusy(false);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the token and copy manually.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setToken("");
    setEmail("");
    setPassword("");
    toast.success("Signed out.");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#0a0a0a] text-white">
      {/* Kill Chrome/Safari autofill's white box — keep inputs dark & premium. */}
      <style jsx global>{`
        .mcp-field:-webkit-autofill,
        .mcp-field:-webkit-autofill:hover,
        .mcp-field:-webkit-autofill:focus,
        .mcp-field:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff;
          transition: background-color 9999s ease-in-out 0s;
          -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.04) inset !important;
          box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.04) inset !important;
        }
      `}</style>

      {/* ─────────────────────────── LEFT: AI connector illustration ─────────────────────────── */}
      <aside className="relative hidden w-[48%] shrink-0 items-center justify-center overflow-hidden bg-[#000000] lg:flex">
        {/* ambient glow behind the (contained) image so edges never look empty */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-56 w-56 rounded-full bg-cyan-500/15 blur-[120px]" />

        <Image
          src="/mcp-hub.png"
          alt="ChatGPT, Gemini, Claude, Grok, and Copilot connecting through MCP to the SplitEase app"
          fill
          priority
          sizes="48vw"
          className="object-contain object-center p-6"
        />

        {/* blend the right edge into the form side for a seamless join */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-[#0a0a0a]" />
      </aside>

      {/* ── Brand label between the image and the form, at the top (desktop) ── */}
      <div className="pointer-events-none absolute left-[48%] top-8 z-20 hidden -translate-x-1/2 items-center gap-3 lg:flex">
        <Image src="/logo-concept-app.svg" alt="" width={40} height={40} className="rounded-xl" />
        <p className="text-lg font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          SplitEase MCP
        </p>
      </div>

      {/* ─────────────────────────── RIGHT: auth form ─────────────────────────── */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-64 w-64 rounded-full bg-violet-500/10 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="relative w-full max-w-[420px]"
        >
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo-concept-app.svg" alt="" width={44} height={44} className="rounded-xl" />
            <p className="text-base font-semibold tracking-tight">SplitEase MCP</p>
          </div>

          <AnimatePresence mode="wait">
            {!ready ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-24 text-white/40"
              >
                <Loader2 className="h-6 w-6 animate-spin" />
              </motion.div>
            ) : !user ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/[0.08] px-3 py-1 text-[11px] font-semibold text-cyan-200">
                  <Sparkles className="h-3 w-3" /> Connect your assistant
                </span>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in to continue</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Log in, copy your secure token, and paste it into Claude, ChatGPT, Gemini, Grok or Copilot.
                </p>

                <button
                  onClick={handleGoogle}
                  disabled={googleBusy}
                  className="group mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white px-4 py-3.5 font-medium text-gray-800 shadow-lg transition hover:bg-white/90 disabled:opacity-60"
                >
                  {googleBusy ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : <GoogleIcon />}
                  Continue with Google
                </button>

                <div className="my-6 flex items-center gap-4 text-[11px] font-medium uppercase tracking-widest text-white/25">
                  <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleEmail} className="space-y-3.5">
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35 transition group-focus-within:text-cyan-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="mcp-field w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-500/10"
                    />
                  </div>

                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35 transition group-focus-within:text-cyan-300" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="mcp-field w-full rounded-2xl border border-white/12 bg-white/[0.04] py-3.5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 px-4 py-3.5 font-semibold text-white shadow-[0_10px_30px_-8px_rgba(56,189,248,0.6)] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
                  </button>
                </form>

                <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
                  Tokens expire in ~1 hour. You can generate a new one anytime.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="token"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease }}
              >
                <div className="flex items-center gap-2 text-emerald-300">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400/15">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Signed in</span>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your MCP token is ready</h1>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-600 text-xs font-black text-white">
                    {(user.email || user.displayName || "U").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.email || user.displayName}</p>
                    <p className="text-[11px] text-white/40">Authenticated with Firebase</p>
                  </div>
                </div>

                <label className="mb-2 mt-6 block text-xs font-medium text-white/50">Secure token</label>
                <textarea
                  readOnly
                  value={token}
                  onFocus={(e) => e.target.select()}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-cyan-200/90 outline-none focus:border-cyan-400/40"
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={copyToken}
                    disabled={!token}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.6)] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy token"}
                  </button>
                  <button
                    onClick={refreshToken}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 font-medium text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                    New token
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <Bot className="h-3.5 w-3.5" /> How to use it
                  </p>
                  <p className="text-[12px] leading-relaxed text-white/60">
                    In your AI assistant, say:{" "}
                    <span className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">
                      set my SplitEase token to &lt;paste&gt;
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white/80"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
