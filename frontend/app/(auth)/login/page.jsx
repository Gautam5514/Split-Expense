"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "@/lib/toast";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const expenseCards = [
  {
    initial: "A",
    gradient: "from-emerald-400 to-teal-500",
    title: "Dinner at Nobu",
    meta: "Alex paid · 3 people",
    amount: "$84.50",
    amountColor: "text-emerald-400",
    sub: "you owe $28.17",
    offset: "",
  },
  {
    initial: "M",
    gradient: "from-cyan-400 to-teal-500",
    title: "Airbnb — Miami",
    meta: "Maya paid · 5 people",
    amount: "$620.00",
    amountColor: "text-cyan-400",
    sub: "you owe $124.00",
    offset: "ml-5",
  },
  {
    initial: "R",
    gradient: "from-orange-400 to-pink-500",
    title: "Groceries run",
    meta: "You paid · 2 people",
    amount: "$47.30",
    amountColor: "text-orange-400",
    sub: "Ryan owes $23.65",
    offset: "",
  },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { token, setToken } = useAuth();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (token) router.replace("/users");
  }, [token, router]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [errors, setErrors] = useState({});

  // Forgot password flow states
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  const validateLogin = () => {
    const e = {};
    if (!email.trim()) e.email = "Email address is required.";
    else if (!emailRegex.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateForgot = () => {
    const e = {};
    if (!forgotEmail.trim()) e.forgotEmail = "Email address is required.";
    else if (!emailRegex.test(forgotEmail.trim())) e.forgotEmail = "Please enter a valid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!validateForgot()) return;
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setEmailSent(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else toast.error(data?.message || "Failed to send reset email.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Sync user with MongoDB — backend auto-creates the record if missing.
      // No JWT is returned; onIdTokenChanged in AuthContext sets the token.
      const idToken = await result.user.getIdToken();
      await api.post("/auth/google", { token: idToken }).catch(() => {});
      toast.success("Login successful!");
      const pendingInvite = localStorage.getItem("pendingInvite");
      if (pendingInvite) {
        localStorage.removeItem("pendingInvite");
        router.push(`/join/${pendingInvite}`);
      } else {
        router.push("/users");
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else setErrors({ password: "Invalid email or password. Please check and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await api.post("/auth/google", { token: idToken }).catch(() => {});
      toast.success(`Welcome, ${result.user.displayName || "User"}!`);
      const pendingInvite = localStorage.getItem("pendingInvite");
      if (pendingInvite) {
        localStorage.removeItem("pendingInvite");
        router.push(`/join/${pendingInvite}`);
      } else {
        router.push("/users");
      }
    } catch (err) {
      console.error("Google Sign-In error:", err);
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("auth/unauthorized-domain")) {
        toast.error(
          "Domain Unauthorized! Please add this deployment domain to your Firebase Console under Authentication > Settings > Authorized Domains.",
          { duration: 10000 }
        );
      } else {
        toast.error(err.message || "Google Sign-In failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* h-[100dvh] + overflow-hidden = zero scroll */
    <div className="auth-page-wrapper h-[100dvh] overflow-hidden flex" style={{ background: "#030B16" }}>

      {/* ── Left visual panel ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden flex-col justify-center px-12 py-8">
        {/* bg */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#03101F 0%,#062035 50%,#031A30 100%)" }} />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(8,145,178,1) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* orbs */}
        <div className="absolute w-[460px] h-[460px] rounded-full pointer-events-none" style={{ top: "5%", left: "-10%", background: "radial-gradient(circle,rgba(8,145,178,0.18) 0%,transparent 70%)" }} />
        <div className="absolute w-[360px] h-[360px] rounded-full pointer-events-none" style={{ bottom: "0%", right: "-5%", background: "radial-gradient(circle,rgba(14,116,144,0.15) 0%,transparent 70%)" }} />

        <div className="relative z-10 max-w-[400px]">
          {/* logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10" style={{ boxShadow: "0 8px 24px rgba(8,145,178,0.4)" }}>
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">SplitEase</span>
          </div>

          {/* headline */}
          <h1 className="text-[2.2rem] font-extrabold text-white leading-[1.15] mb-3">
            Share expenses,<br />
            <span style={{ background: "linear-gradient(90deg,#22D3EE,#38BDF8,#0EA5E9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              not the hassle.
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Track group expenses effortlessly and settle up with ease — no awkward conversations needed.
          </p>

          {/* expense cards */}
          <div className="space-y-2.5">
            {expenseCards.map((card) => (
              <div key={card.title} className={`${card.offset} flex items-center gap-3 rounded-2xl px-4 py-3 border border-white/[0.07] transition-transform hover:-translate-y-0.5`} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {card.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{card.title}</p>
                  <p className="text-slate-500 text-xs">{card.meta}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${card.amountColor}`}>{card.amount}</p>
                  <p className="text-slate-500 text-xs">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* stats */}
          <div className="mt-7 flex gap-8">
            {[{ value: "50K+", label: "Users" }, { value: "$2M+", label: "Settled" }, { value: "4.9 ★", label: "Rating" }].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 h-[100dvh] flex flex-col justify-center items-center px-6 lg:px-10 overflow-hidden relative" style={{ background: "#04111F" }}>
        <div className="w-full max-w-[380px] py-4">
          {/* mobile logo */}
          <div className="flex items-center gap-2.5 mb-5 lg:hidden justify-center">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-xl font-extrabold text-white">SplitEase</span>
          </div>

          {!isForgotFlow ? (
            <>
              {/* heading */}
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm">Sign in to continue splitting expenses</p>
              </div>

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              {/* divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-[11px] font-medium text-slate-600 uppercase tracking-[0.2em]" style={{ background: "#0d0d18" }}>
                    or continue with email
                  </span>
                </div>
              </div>

              {/* form */}
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                {/* email */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200"
                    style={{
                      background: focused === "email" ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: errors.email ? "#f87171" : (focused === "email" ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)"),
                      boxShadow: errors.email ? "0 0 0 3px rgba(248,113,113,0.1)" : (focused === "email" ? "0 0 0 3px rgba(8,145,178,0.1)" : "none"),
                    }}>
                    <Mail className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type="email" placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                      onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-3 rounded-xl outline-none text-sm"
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email}</p>}
                </div>

                {/* password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotFlow(true);
                        setEmailSent(false);
                        setErrors({});
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200"
                    style={{
                      background: focused === "password" ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: errors.password ? "#f87171" : (focused === "password" ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)"),
                      boxShadow: errors.password ? "0 0 0 3px rgba(248,113,113,0.1)" : (focused === "password" ? "0 0 0 3px rgba(8,145,178,0.1)" : "none"),
                    }}>
                    <Lock className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                      onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-12 py-3 rounded-xl outline-none text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-600 hover:text-slate-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password}</p>}
                </div>

                {/* submit */}
                <button
                  type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {isLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <a href="/register" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
                  Create one free →
                </a>
              </p>

              <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500">
                <Link href="/privacy" className="hover:text-sky-300 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-sky-300 transition-colors">
                  Terms
                </Link>
                <Link href="/help-center" className="hover:text-sky-300 transition-colors">
                  Help Center
                </Link>
                <Link href="/contact" className="hover:text-sky-300 transition-colors">
                  Contact Us
                </Link>
              </nav>
            </>
          ) : !emailSent ? (
            <>
              {/* heading */}
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white mb-1">Forgot password</h2>
                <p className="text-slate-400 text-sm">Enter your email and we&apos;ll send you a secure reset link</p>
              </div>

              {/* form */}
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {/* email */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200"
                    style={{
                      background: focused === "forgotEmail" ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: errors.forgotEmail ? "#f87171" : (focused === "forgotEmail" ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)"),
                      boxShadow: errors.forgotEmail ? "0 0 0 3px rgba(248,113,113,0.1)" : (focused === "forgotEmail" ? "0 0 0 3px rgba(8,145,178,0.1)" : "none"),
                    }}>
                    <Mail className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type="email" placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); clearError("forgotEmail"); }}
                      onFocus={() => setFocused("forgotEmail")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-3 rounded-xl outline-none text-sm"
                    />
                  </div>
                  {errors.forgotEmail && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.forgotEmail}</p>}
                </div>

                {/* submit */}
                <button
                  type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28 rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {forgotLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Sending…</> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsForgotFlow(false);
                  setEmailSent(false);
                  setErrors({});
                }}
                className="mt-6 w-full text-center text-sm text-sky-400 hover:text-sky-300 transition-colors font-semibold cursor-pointer outline-none"
              >
                ← Back to Sign in
              </button>
            </>
          ) : (
            <>
              {/* Check your email screen */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 text-sky-400">
                  <Mail className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We sent a password reset link to<br />
                  <span className="text-sky-400 font-semibold">{forgotEmail}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-slate-400 leading-relaxed mb-6 space-y-2">
                <p>• Check your spam folder if you don&apos;t see it.</p>
                <p>• The link expires in <span className="text-white font-semibold">15 minutes</span>.</p>
                <p>• You can safely close this tab after clicking the link.</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setEmailSent(false); }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer outline-none block"
                >
                  Didn&apos;t receive it? <span className="text-sky-400 font-semibold hover:underline">Resend reset link</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotFlow(false);
                    setEmailSent(false);
                    setErrors({});
                  }}
                  className="w-full text-center text-sm text-sky-400 hover:text-sky-300 transition-colors font-semibold cursor-pointer outline-none block"
                >
                  ← Return to Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
