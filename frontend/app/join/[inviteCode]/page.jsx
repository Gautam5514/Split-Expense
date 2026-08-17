"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import toast from "@/lib/toast";
import { Users, Loader2, LogIn, CheckCircle2, RefreshCw } from "lucide-react";

export default function JoinGroupPage() {
  const { inviteCode } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | joining | success | error | unauthenticated | already_member
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!inviteCode) return;

    const auth = getAuth();

    // auth.currentUser is null synchronously on page load - Firebase needs time
    // to restore the session from device storage. onAuthStateChanged waits for
    // that resolution so we never make a premature "not logged in" decision.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // only care about the first resolved state

      if (!user) {
        localStorage.setItem("pendingInvite", inviteCode);
        setStatus("unauthenticated");
        return;
      }

      setStatus("joining");
      try {
        const res = await api.post(`/groups/join/${inviteCode}`);
        const groupId = res.data?.group?._id;
        setStatus("success");
        setTimeout(() => router.replace(groupId ? `/groups/${groupId}` : "/dashboard"), 1800);
      } catch (err) {
        const httpStatus = err?.response?.status;
        const msg = err?.response?.data?.message || "";

        if (httpStatus === 401) {
          // Token not ready yet - store invite and ask user to sign in again
          localStorage.setItem("pendingInvite", inviteCode);
          setStatus("unauthenticated");
          return;
        }

        if (
          httpStatus === 200 ||
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("member")
        ) {
          // Already a member - just redirect to the group
          const groupId = err?.response?.data?.group?._id;
          setStatus("success");
          setTimeout(() => router.replace(groupId ? `/groups/${groupId}` : "/dashboard"), 1200);
          return;
        }

        setErrorMsg(
          httpStatus === 404
            ? "This invite link is invalid or has expired."
            : msg || "Something went wrong. Please try again."
        );
        setStatus("error");
      }
    });

    return () => unsubscribe();
  }, [inviteCode, router]);

  const goToLogin = () => {
    localStorage.setItem("pendingInvite", inviteCode);
    router.push("/login");
  };
  const goToRegister = () => {
    localStorage.setItem("pendingInvite", inviteCode);
    router.push("/register");
  };
  const retryJoin = () => {
    setStatus("loading");
    setErrorMsg("");
    // Re-run by unmounting + remounting via state trick is complex;
    // simplest is to reload the page - the onAuthStateChanged will re-run cleanly.
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-concept-app.svg" alt="SplitEase" className="w-8 h-8 rounded-xl" />
          <span className="text-xl font-extrabold text-foreground">SplitEase</span>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-xl p-8 space-y-5">

          {/* Loading */}
          {(status === "loading" || status === "joining") && (
            <>
              <div className="flex justify-center">
                <Loader2 size={40} className="animate-spin text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {status === "joining" ? "Joining group…" : "Checking your invite…"}
              </p>
              {status === "joining" && (
                <p className="text-xs text-muted-foreground">You'll be redirected in a moment.</p>
              )}
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">You're in!</p>
              <p className="text-sm text-muted-foreground">Redirecting you to the group…</p>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <Users size={28} className="text-destructive" />
                </div>
              </div>
              <p className="text-base font-bold text-foreground">Link Problem</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {errorMsg || "This invite link may have expired or already been used."}
              </p>
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={retryJoin}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition cursor-pointer"
                >
                  <RefreshCw size={14} /> Try Again
                </button>
                <button
                  onClick={() => router.replace("/dashboard")}
                  className="w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}

          {/* Unauthenticated */}
          {status === "unauthenticated" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <LogIn size={28} className="text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground mb-1">You're invited!</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in or create a free account to join the group and start splitting expenses together.
                </p>
              </div>
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={goToLogin}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-bold shadow-lg shadow-cyan-600/20 hover:opacity-95 transition cursor-pointer"
                >
                  Sign in to Join
                </button>
                <button
                  onClick={goToRegister}
                  className="w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition cursor-pointer"
                >
                  Create a free account
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                Your invite code{" "}
                <span className="font-mono font-bold text-muted-foreground">{inviteCode}</span>{" "}
                will be remembered after you sign in.
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
