"use client";

/**
 * Drop into /login and /register. Does nothing unless the page was opened by an
 * AI app's connect flow (?mcp_request=...). Then it:
 *  - shows a banner: "<App> wants to connect - sign in or create an account";
 *  - after the page reports a successful sign-in/sign-up (notifyMcpSignedIn),
 *    finishes the connection straight away and returns the user to the AI app;
 *  - if the visitor was ALREADY signed in when they arrived, asks for one click
 *    ("Connect as you@x.com") instead of connecting silently.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, Check, X, Link2 } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "@/lib/toast";
import {
  MCP_SIGNED_IN_EVENT,
  captureMcpRequest,
  clearMcpRequest,
  fetchMcpRequestInfo,
  finishMcpConnect,
} from "@/lib/mcpConnect";

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/95 px-5 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-[400px] rounded-3xl border border-white/10 bg-[#111] p-7 text-white shadow-2xl">{children}</div>
    </div>
  );
}

export default function McpConnectGate() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [requestId, setRequestId] = useState(null);
  const [info, setInfo] = useState(null);
  // "none" | "loading" | "ready" | "expired" | "connecting" | "done" | "error"
  const [status, setStatus] = useState("none");
  const [returnUrl, setReturnUrl] = useState(null);
  const [errorText, setErrorText] = useState("");
  // Was the visitor already signed in when auth finished loading? (null = not known yet)
  const [startedSignedIn, setStartedSignedIn] = useState(null);

  const wantConnect = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!loading && startedSignedIn === null) setStartedSignedIn(!!token);
  }, [loading, token, startedSignedIn]);

  // 1) Is there a pending request? Load what it is.
  useEffect(() => {
    const id = captureMcpRequest();
    if (!id) return;
    let cancelled = false;
    setRequestId(id);
    setStatus("loading");
    fetchMcpRequestInfo(id)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          clearMcpRequest();
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorText("Could not reach SplitEase. Check your connection and try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    if (busy.current || !requestId) return;
    busy.current = true;
    wantConnect.current = false;
    setStatus("connecting");
    try {
      const url = await finishMcpConnect(requestId, true);
      clearMcpRequest();
      setReturnUrl(url);
      setStatus("done");
      window.location.assign(url);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 400 || code === 404) {
        clearMcpRequest();
        setStatus("expired");
      } else if (code === 401) {
        toast.error("Your session expired. Please sign in again.");
        await signOut(auth).catch(() => {});
        setStatus("ready");
      } else {
        setErrorText(err?.response?.data?.message || "Could not complete the connection. Please try again.");
        setStatus("error");
      }
      busy.current = false;
    }
  }, [requestId]);

  // 2) The page tells us the user just signed in / signed up -> connect now.
  useEffect(() => {
    const onSignedIn = () => {
      if (status === "ready") connect();
      else wantConnect.current = true; // request info still loading
    };
    window.addEventListener(MCP_SIGNED_IN_EVENT, onSignedIn);
    return () => window.removeEventListener(MCP_SIGNED_IN_EVENT, onSignedIn);
  }, [status, connect]);

  useEffect(() => {
    if (status === "ready" && wantConnect.current) connect();
  }, [status, connect]);

  // A stale/expired request while the user is signed in: don't strand them here.
  useEffect(() => {
    if (status === "expired" && token) router.replace("/users");
  }, [status, token, router]);

  const cancel = async () => {
    // Tell the AI app the user said no, so it doesn't hang.
    try {
      const url = await finishMcpConnect(requestId, false);
      clearMcpRequest();
      window.location.assign(url);
    } catch {
      clearMcpRequest();
      setStatus("none");
    }
  };

  const switchAccount = async () => {
    await signOut(auth).catch(() => {});
    setStartedSignedIn(false);
    setStatus("ready");
  };

  if (status === "none") return null;
  const app = info?.clientName || "an AI app";
  const email = auth.currentUser?.email;

  if (status === "connecting" || status === "done") {
    return (
      <Overlay>
        <div className="flex flex-col items-center py-4 text-center">
          {status === "done" ? (
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <Check className="h-6 w-6" strokeWidth={3} />
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          )}
          <h2 className="mt-5 text-xl font-semibold">{status === "done" ? `Connected to ${app}` : `Connecting ${app}...`}</h2>
          <p className="mt-2 text-sm text-white/50">
            {status === "done" ? "Taking you back to your app. You can close this tab if nothing happens." : "Just a moment."}
          </p>
          {status === "done" && returnUrl && (
            <a href={returnUrl} className="mt-4 text-sm text-cyan-300 underline-offset-2 hover:underline">
              Return to {app}
            </a>
          )}
        </div>
      </Overlay>
    );
  }

  if (status === "error") {
    return (
      <Overlay>
        <h2 className="text-lg font-semibold">Couldn&apos;t connect</h2>
        <p className="mt-2 text-sm text-white/55">{errorText}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => { clearMcpRequest(); setStatus("none"); }} className="rounded-2xl border border-white/12 px-4 py-3 text-sm text-white/80 hover:bg-white/5">
            Dismiss
          </button>
          <button onClick={() => { if (info) { busy.current = false; connect(); } else window.location.reload(); }} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-600 px-4 py-3 text-sm font-semibold text-white hover:brightness-110">
            Try again
          </button>
        </div>
      </Overlay>
    );
  }

  if (status === "expired") {
    // Signed-in users are redirected by the effect above; signed-out users see a notice and a normal page.
    return (
      <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 bg-amber-400/15 px-4 py-2.5 text-center text-xs text-amber-100 backdrop-blur" role="status">
        <span>This connection link expired. Go back to your AI app and tap Connect again.</span>
        <button onClick={() => setStatus("none")} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  // status === "loading" | "ready"
  if (status === "ready" && startedSignedIn === null) return null; // auth still restoring
  if (status === "ready" && token && startedSignedIn) {
    return (
      <Overlay>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Link2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          Connect <span className="text-cyan-300">{app}</span> to SplitEase?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          It will be able to see your groups, expenses and balances{email ? <> as <span className="text-white/80">{email}</span></> : null}. You&apos;ll be sent back to{" "}
          <span className="break-all font-mono text-white/70">{info?.redirectHost || "the app"}</span>.
        </p>
        <button onClick={connect} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 px-4 py-3.5 font-semibold text-white hover:brightness-110">
          Connect{email ? ` as ${email}` : ""}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <button onClick={switchAccount} className="rounded-2xl border border-white/12 px-3 py-2.5 text-white/70 hover:bg-white/5">Use another account</button>
          <button onClick={cancel} className="rounded-2xl border border-white/12 px-3 py-2.5 text-white/70 hover:bg-white/5">Cancel</button>
        </div>
      </Overlay>
    );
  }

  if (status === "ready") {
    return (
      <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 border-b border-cyan-300/20 bg-cyan-400/10 px-4 py-2.5 text-center text-xs text-cyan-50 backdrop-blur" role="status">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
        <span>
          <span className="font-semibold">{app}</span> wants to connect to your SplitEase account. Sign in or create an account to continue
          {info?.redirectHost ? <span className="text-cyan-100/60"> (returns to {info.redirectHost})</span> : null}.
        </span>
      </div>
    );
  }

  return null; // loading
}
