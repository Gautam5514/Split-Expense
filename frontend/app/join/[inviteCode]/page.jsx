"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2, LogIn, RefreshCw, ShieldCheck, Smartphone, UserPlus, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { ANDROID_PACKAGE, normalizeInviteCode } from "@/lib/inviteCode";
import { clearPendingInvite, savePendingInvite } from "@/lib/pendingInvite";

import BrandLogo from "@/components/BrandLogo";
// One invite link for everyone:
//  - Android with the app installed -> opens the app's own join screen
//  - Android without the app, iPhone, desktop -> joins right here on the web
// The page always shows which group the invite is for, before anything happens.

const BTN_PRIMARY = "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 cursor-pointer";
const BTN_GHOST = "flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted cursor-pointer";

const TYPE_LABEL = { trip: "Trip", roommate: "Roommates", business: "Business", general: "Group" };

const readStore = (fn) => { try { return fn(); } catch { return null; } };

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = decodeURIComponent(String(params?.inviteCode || ""));
  const code = normalizeInviteCode(rawCode) || rawCode;

  // preview: loading | ready | invalid | expired | error
  const [preview, setPreview] = useState({ state: "loading", data: null, message: "" });
  // flow: checking | handoff | signin | joining | joined | already | requested | failed
  const [flow, setFlow] = useState("checking");
  const [failMsg, setFailMsg] = useState("");
  const [user, setUser] = useState(undefined); // undefined = auth not restored yet
  const joinStarted = useRef(false);

  // 1. What is this invite for?
  const loadPreview = useCallback(async () => {
    setPreview({ state: "loading", data: null, message: "" });
    try {
      const { data } = await api.get(`/groups/invite/${encodeURIComponent(code)}`);
      setPreview({ state: "ready", data, message: "" });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "";
      if (status === 404) setPreview({ state: "invalid", data: null, message });
      else if (status === 410) setPreview({ state: "expired", data: null, message });
      // Network trouble or rate limit: don't block joining, just go without the preview.
      else setPreview({ state: "error", data: null, message });
    }
  }, [code]);

  useEffect(() => { if (code) loadPreview(); }, [code, loadPreview]);

  // 2. Who is visiting? (Firebase restores the session asynchronously.)
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Read after mount so server and browser render the same first frame.
  const [isAndroid, setIsAndroid] = useState(false);
  const [platformKnown, setPlatformKnown] = useState(false);
  // In-app browsers (Instagram, Facebook, Android WebViews) block intent://
  // links, so there we never auto-jump - the "Open in app" button stays offered.
  const [inAppBrowser, setInAppBrowser] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsAndroid(/Android/i.test(ua));
    setInAppBrowser(/FBAN|FBAV|Instagram|Line\/|Snapchat|; wv\)/i.test(ua));
    setPlatformKnown(true);
  }, []);

  // Opens the app if it's installed. If it isn't, Chrome loads the fallback:
  // this same page with ?web=1, which then simply carries on in the browser.
  const openInApp = useCallback(() => {
    const here = new URL(window.location.href);
    here.searchParams.set("web", "1");
    window.location.href =
      `intent://join/${encodeURIComponent(code)}#Intent;scheme=splitapp;package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(here.toString())};end`;
  }, [code]);

  const join = useCallback(async () => {
    if (joinStarted.current) return;
    joinStarted.current = true;
    setFlow("joining");
    try {
      const res = await api.post(`/groups/join/${encodeURIComponent(code)}`);
      clearPendingInvite();
      const groupId = res.data?.group?._id;
      if (res.status === 202 || res.data?.status === "requested" || res.data?.pending) {
        setFlow("requested");
        return;
      }
      setFlow(res.data?.alreadyMember ? "already" : "joined");
      setTimeout(() => router.replace(groupId ? `/groups/${groupId}` : "/dashboard"), res.data?.alreadyMember ? 900 : 1500);
    } catch (err) {
      joinStarted.current = false;
      const status = err?.response?.status;
      if (status === 401) {
        savePendingInvite(code);
        setFlow("signin");
        return;
      }
      if (status === 410) setPreview((p) => ({ ...p, state: "expired" }));
      else if (status === 404) setPreview((p) => ({ ...p, state: "invalid" }));
      setFailMsg(err?.response?.data?.message || (status ? "Something went wrong. Please try again." : "You seem to be offline. Check your connection and try again."));
      setFlow("failed");
    }
  }, [code, router]);

  // 3. Decide what happens once we know both the invite and the visitor.
  useEffect(() => {
    if (!code || !platformKnown || user === undefined || preview.state === "loading") return;
    if (preview.state === "invalid" || preview.state === "expired") return;
    if (joinStarted.current || ["joined", "already", "requested", "failed"].includes(flow)) return;

    // ?via=web: the invite was shared from the website, so it joins here.
    // ?web=1: we already tried the app (or the visitor chose the browser).
    // Links shared from the app, QR codes and emails try the app first.
    const q = new URLSearchParams(window.location.search);
    const stayOnWeb = q.get("web") === "1" || q.get("via") === "web";
    const triedApp = readStore(() => sessionStorage.getItem(`se-app-handoff:${code}`));
    if (isAndroid && !inAppBrowser && !stayOnWeb && !triedApp && flow === "checking") {
      readStore(() => sessionStorage.setItem(`se-app-handoff:${code}`, "1"));
      setFlow("handoff");
      openInApp();
      return;
    }
    if (flow === "handoff") return; // waiting for the visitor to pick app or browser

    if (!user) {
      savePendingInvite(code);
      setFlow("signin");
      return;
    }
    join();
  }, [code, platformKnown, user, preview.state, flow, isAndroid, inAppBrowser, openInApp, join]);

  const continueOnWeb = () => {
    if (!user) {
      savePendingInvite(code);
      setFlow("signin");
    } else join();
  };
  const toAuth = (path) => {
    savePendingInvite(code);
    router.push(path);
  };
  const retry = () => {
    setFailMsg("");
    setFlow("checking");
    loadPreview();
  };

  const g = preview.data?.group;
  const dead = preview.state === "invalid" || preview.state === "expired";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrandLogo alt="" className="w-9 h-9 rounded-xl" />
          <span className="text-xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-brand)" }}>SplitEase</span>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Who invited you to what */}
          <div className="px-7 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-primary">
              {dead ? "Invite link" : "You're invited"}
            </p>
            {preview.state === "loading" ? (
              <div className="mt-3 space-y-2 animate-pulse">
                <div className="h-6 w-2/3 rounded-md bg-muted" />
                <div className="h-4 w-1/2 rounded-md bg-muted" />
              </div>
            ) : g ? (
              <div className="mt-3 flex items-center gap-4">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                  {g.photo ? <img src={g.photo} alt="" className="w-full h-full object-cover" /> : <Users size={24} className="text-primary" />}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">{g.name}</h1>
                  <p className="text-sm text-muted-foreground truncate">
                    {preview.data.invitedBy ? <>Invited by <span className="font-medium text-foreground">{preview.data.invitedBy}</span> · </> : null}
                    {TYPE_LABEL[g.type] || "Group"} · {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ) : (
              <h1 className="mt-2 text-xl font-bold text-foreground">
                {dead ? "This link can't be used" : "Join a group on SplitEase"}
              </h1>
            )}
            {g?.completed && !dead && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={14} className="text-primary" /> This group has been marked as completed.
              </p>
            )}
            {preview.data?.joinApproval && !dead && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-primary" /> The group creator approves new members.
              </p>
            )}
          </div>

          <div className="px-7 py-7 space-y-5 text-center">
            {dead && (
              <State icon={preview.state === "expired" ? Clock : AlertCircle} tone="danger"
                title={preview.state === "expired" ? "This invite has expired" : "This invite link isn't valid"}
                text={preview.state === "expired"
                  ? "Invite links stop working after a while for safety. Ask the person who invited you to share a new one."
                  : "It may have been reset by the group creator, or mistyped. Ask for a new link or code."}>
                <Link href="/join" className={BTN_PRIMARY}>Enter a code instead</Link>
                <button onClick={() => router.replace("/dashboard")} className={BTN_GHOST}>Go to dashboard</button>
              </State>
            )}

            {!dead && (flow === "checking" || flow === "joining") && (
              <div className="py-2">
                <Loader2 size={34} className="mx-auto animate-spin text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">{flow === "joining" ? "Adding you to the group…" : "Checking your invite…"}</p>
              </div>
            )}

            {!dead && flow === "handoff" && (
              <State icon={Smartphone} tone="primary" title="Opening the SplitEase app…"
                text="If the app is installed it opens straight to this group. No app? Continue here in your browser.">
                <button onClick={continueOnWeb} className={BTN_PRIMARY}>Continue in browser</button>
                <button onClick={openInApp} className={BTN_GHOST}><ExternalLink size={14} /> Open in app</button>
              </State>
            )}

            {!dead && flow === "signin" && (
              <State icon={LogIn} tone="primary" title="Sign in to join"
                text="Use your SplitEase account, or create one for free. You'll come straight back to this group.">
                <button onClick={() => toAuth("/login")} className={BTN_PRIMARY}><LogIn size={15} /> Sign in to join</button>
                <button onClick={() => toAuth("/register")} className={BTN_GHOST}><UserPlus size={15} /> Create a free account</button>
              </State>
            )}

            {flow === "joined" && (
              <State icon={CheckCircle2} tone="success" title="You're in!" text="Taking you to the group…" />
            )}
            {flow === "already" && (
              <State icon={CheckCircle2} tone="success" title="You're already in this group" text="Opening it for you…" />
            )}
            {flow === "requested" && (
              <State icon={Clock} tone="primary" title="Request sent"
                text="The group creator approves new members. You'll get a notification as soon as you're added.">
                <button onClick={() => router.replace("/dashboard")} className={BTN_GHOST}>Go to dashboard</button>
              </State>
            )}
            {!dead && flow === "failed" && (
              <State icon={AlertCircle} tone="danger" title="Couldn't join" text={failMsg}>
                <button onClick={retry} className={BTN_PRIMARY}><RefreshCw size={14} /> Try again</button>
                <button onClick={() => router.replace("/dashboard")} className={BTN_GHOST}>Go to dashboard</button>
              </State>
            )}

            {isAndroid && !dead && ["signin", "failed"].includes(flow) && (
              <button onClick={openInApp} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Smartphone size={13} /> Have the app? Open this invite in SplitEase
              </button>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Invite code <span className="font-mono font-semibold tracking-wider text-foreground">{code}</span>
          {" · "}
          <Link href="/join" className="text-primary hover:underline">Have a different code?</Link>
        </p>
      </div>

    </div>
  );
}

const TONES = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  danger: "bg-destructive/10 border-destructive/20 text-destructive",
};

function State({ icon: Icon, tone, title, text, children }) {
  return (
    <>
      <div className={`mx-auto w-14 h-14 rounded-full border flex items-center justify-center ${TONES[tone]}`}>
        <Icon size={26} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{title}</p>
        {text && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{text}</p>}
      </div>
      {children && <div className="space-y-2.5 pt-1">{children}</div>}
    </>
  );
}
