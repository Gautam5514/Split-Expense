"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Gift } from "lucide-react";
import { captureReferralCode } from "@/lib/referral";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function InvitePage() {
  const { code } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!code) return;
    captureReferralCode(code);

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      // Already signed in - referral attribution only applies at first-ever
      // signup, so just send returning users to the dashboard.
      router.replace(user ? "/dashboard" : `/register?ref=${encodeURIComponent(code)}`);
    });

    return () => unsubscribe();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-concept-a.svg" alt="SplitEase" className="w-8 h-8 rounded-xl" />
          <span className="text-xl font-extrabold text-foreground">SplitEase</span>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-xl p-8 space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Gift size={28} className="text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">You're invited to SplitEase!</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign up to start splitting expenses with friends - and earn coin rewards along the way.
          </p>
          <div className="flex justify-center pt-1">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
