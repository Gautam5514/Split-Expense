"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "@/lib/toast";
import { Eye, EyeOff, Lock, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

const visualCards = [
  {
    initial: "🛡️",
    title: "Secure Account",
    desc: "Use at least 8 characters, capital letters, and numbers.",
  },
  {
    initial: "⚡",
    title: "Instant Sync",
    desc: "Passwords sync automatically between MongoDB and Firebase.",
  },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
    } else {
      toast.error("Invalid or missing password reset token.");
    }
  }, [searchParams]);

  const passwordStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#10b981"][passwordStrength];

  const validateReset = () => {
    const e = {};
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password)) e.password = "Password must include at least one uppercase letter (A-Z).";
    else if (!/[0-9]/.test(password)) e.password = "Password must include at least one number (0-9).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Cannot reset password without a valid token.");
      return;
    }
    if (!validateReset()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset successful!");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else toast.error(data?.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* h-[100dvh] + overflow-hidden = zero scroll */
    <div className="auth-page-wrapper h-[100dvh] overflow-hidden flex" style={{ background: "#08080f" }}>
      {/* ── Left visual panel ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden flex-col justify-center px-12 py-8">
        {/* bg */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0c1445 0%,#1a0533 55%,#0f0c29 100%)" }} />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(8,145,178,1) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* orbs */}
        <div className="absolute w-[440px] h-[440px] rounded-full pointer-events-none" style={{ bottom: "-10%", left: "-5%", background: "radial-gradient(circle,rgba(8,145,178,0.15) 0%,transparent 70%)" }} />
        <div className="absolute w-[320px] h-[320px] rounded-full pointer-events-none" style={{ top: "5%", right: "-5%", background: "radial-gradient(circle,rgba(8,145,178,0.12) 0%,transparent 70%)" }} />

        <div className="relative z-10 max-w-[400px]">
          {/* logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10" style={{ boxShadow: "0 8px 24px rgba(8,145,178,0.4)" }}>
              <img src="/logo-concept-app.svg" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">SplitEase</span>
          </div>

          {/* headline */}
          <h1 className="text-[2.2rem] font-extrabold text-white leading-[1.15] mb-3">
            Secure your account,<br />
            <span style={{ background: "linear-gradient(90deg,#a78bfa,#c084fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              restore control.
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Change your password to recover account access and secure your shared expenses.
          </p>

          {/* steps */}
          <div className="space-y-4">
            {visualCards.map((card, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-3 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-zinc-900 border border-white/[0.08]">
                  {card.initial}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{card.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 h-[100dvh] flex flex-col justify-center items-center px-6 lg:px-10 overflow-hidden relative" style={{ background: "#0d0d18" }}>
        <div className="w-full max-w-[380px] py-4">
          {/* mobile logo */}
          <div className="flex items-center gap-2.5 mb-5 lg:hidden justify-center">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              <img src="/logo-concept-app.svg" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-xl font-extrabold text-white">SplitEase</span>
          </div>

          {/* heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
            <p className="text-slate-400 text-sm">Please choose a new, secure password</p>
          </div>

          {/* form */}
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {/* password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative flex items-center rounded-xl border transition-all duration-200"
                style={{
                  background: focused === "password" ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
                  borderColor: errors.password ? "#f87171" : (focused === "password" ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)"),
                  boxShadow: errors.password ? "0 0 0 3px rgba(248,113,113,0.1)" : (focused === "password" ? "0 0 0 3px rgba(8,145,178,0.1)" : "none"),
                }}>
                <Lock className="absolute left-4 w-4 h-4 text-slate-600" />
                <input
                  type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "" })); }}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                  className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-12 py-3 rounded-xl outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-600 hover:text-slate-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password}</p>}

              {/* strength meter */}
              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= passwordStrength ? strengthColor : "rgba(255,255,255,0.08)" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1.5 font-medium transition-colors duration-200" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* submit */}
            <button
              type="submit" disabled={isLoading || !token}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#0E7490,#0891B2)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {isLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Resetting…</> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered your password?{" "}
            <a href="/login" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
              Sign in →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08080f] text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-3" />
        <span className="text-sm font-medium text-white/60">Loading recovery portal...</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
