"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "@/lib/toast";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, ShieldCheck, RotateCcw } from "lucide-react";
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
const OTP_LENGTH = 6;

// ── OTP input: 6 individual boxes ──────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = value.split("");

  const handleKey = (e, idx) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        next[idx - 1] = "";
        onChange(next.join(""));
        inputsRef.current[idx - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) { inputsRef.current[idx - 1]?.focus(); return; }
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) { inputsRef.current[idx + 1]?.focus(); return; }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    // handle paste of full OTP
    if (raw.length > 1) {
      const pasted = raw.slice(0, OTP_LENGTH);
      const next = pasted.padEnd(OTP_LENGTH, "").split("").slice(0, OTP_LENGTH);
      onChange(next.join(""));
      inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = raw[0];
    onChange(next.join(""));
    if (idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(pasted.padEnd(OTP_LENGTH, ""));
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-13 text-center text-xl font-bold text-white rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            height: "52px",
            background: digits[idx] ? "rgba(8,145,178,0.15)" : "rgba(255,255,255,0.04)",
            border: digits[idx]
              ? "1.5px solid rgba(8,145,178,0.7)"
              : "1.5px solid rgba(255,255,255,0.1)",
            boxShadow: digits[idx] ? "0 0 0 3px rgba(8,145,178,0.12)" : "none",
            caretColor: "transparent",
          }}
        />
      ))}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { token, setToken } = useAuth();

  // step: "login" | "otp" | "forgot" | "forgotSent"
  const [step, setStep] = useState("login");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [focused, setFocused]           = useState("");
  const [errors, setErrors]             = useState({});

  // OTP step
  const [otp, setOtp]               = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Forgot password step
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => { if (token) router.replace("/users"); }, [token, router]);

  // countdown timer for resend
  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const clearError = (field) => setErrors((p) => ({ ...p, [field]: "" }));

  // ── Step 1: validate & send OTP ──────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = "Email address is required.";
    else if (!emailRegex.test(email.trim())) errs.email = "Please enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    try {
      await api.post("/auth/send-login-otp", { email: email.trim(), password });
      setOtp("");
      setStep("otp");
      startCooldown();
      toast.success("Verification code sent to your email.");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((p) => ({ ...p, [data.field]: data.message }));
      else setErrors({ password: data?.message || "Invalid email or password." });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/send-login-otp", { email: email.trim(), password });
      setOtp("");
      startCooldown();
      toast.success("New verification code sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend code.");
    }
  };

  // ── Step 2: verify OTP then Firebase sign-in ──────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < OTP_LENGTH) {
      setErrors({ otp: "Please enter the complete 6-digit code." });
      return;
    }
    setOtpLoading(true);
    setErrors({});
    try {
      await api.post("/auth/verify-login-otp", { email: email.trim(), otp });

      // OTP passed — now complete Firebase auth
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
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
      setErrors({ otp: data?.message || "Invalid or expired code. Please try again." });
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Google login ──────────────────────────────────────────────────────────
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

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!forgotEmail.trim()) errs.forgotEmail = "Email address is required.";
    else if (!emailRegex.test(forgotEmail.trim())) errs.forgotEmail = "Please enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setStep("forgotSent");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((p) => ({ ...p, [data.field]: data.message }));
      else toast.error(data?.message || "Failed to send reset email.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Shared field styles ───────────────────────────────────────────────────
  const fieldStyle = (name) => ({
    background: focused === name ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
    borderColor: errors[name] ? "#f87171" : focused === name ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)",
    boxShadow: errors[name] ? "0 0 0 3px rgba(248,113,113,0.1)" : focused === name ? "0 0 0 3px rgba(8,145,178,0.1)" : "none",
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page-wrapper h-[100dvh] overflow-hidden flex" style={{ background: "#030B16" }}>

      {/* Left visual panel */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden flex-col justify-center px-12 py-8">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#03101F 0%,#062035 50%,#031A30 100%)" }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(8,145,178,1) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        <div className="absolute w-[460px] h-[460px] rounded-full pointer-events-none" style={{ top: "5%", left: "-10%", background: "radial-gradient(circle,rgba(8,145,178,0.18) 0%,transparent 70%)" }} />
        <div className="absolute w-[360px] h-[360px] rounded-full pointer-events-none" style={{ bottom: "0%", right: "-5%", background: "radial-gradient(circle,rgba(14,116,144,0.15) 0%,transparent 70%)" }} />

        <div className="relative z-10 max-w-[400px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10" style={{ boxShadow: "0 8px 24px rgba(8,145,178,0.4)" }}>
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">SplitEase</span>
          </div>

          <h1 className="text-[2.2rem] font-extrabold text-white leading-[1.15] mb-3">
            Share expenses,<br />
            <span style={{ background: "linear-gradient(90deg,#22D3EE,#38BDF8,#0EA5E9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              not the hassle.
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Track group expenses effortlessly and settle up with ease — no awkward conversations needed.
          </p>

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

      {/* Right form panel */}
      <div className="flex-1 h-[100dvh] flex flex-col justify-center items-center px-6 lg:px-10 overflow-hidden relative" style={{ background: "#04111F" }}>
        <div className="w-full max-w-[380px] py-4">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-5 lg:hidden justify-center">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="text-xl font-extrabold text-white">SplitEase</span>
          </div>

          {/* ── STEP: login ─────────────────────────────────────────────── */}
          {step === "login" && (
            <>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm">Sign in to continue splitting expenses</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]" /></div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-[11px] font-medium text-slate-600 uppercase tracking-[0.2em]" style={{ background: "#04111F" }}>
                    or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                {/* email */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email address</label>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200" style={fieldStyle("email")}>
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
                      onClick={() => { setStep("forgot"); setForgotEmail(""); setErrors({}); }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200" style={fieldStyle("password")}>
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

                <button
                  type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {isLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Sending code…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <a href="/register" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">Create one free →</a>
              </p>

              <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500">
                <Link href="/privacy" className="hover:text-sky-300 transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-sky-300 transition-colors">Terms</Link>
                <Link href="/help-center" className="hover:text-sky-300 transition-colors">Help Center</Link>
                <Link href="/contact" className="hover:text-sky-300 transition-colors">Contact Us</Link>
              </nav>
            </>
          )}

          {/* ── STEP: otp ───────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              {/* Shield icon */}
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(8,145,178,0.1)", border: "1.5px solid rgba(8,145,178,0.25)" }}>
                  <ShieldCheck className="w-8 h-8 text-sky-400" />
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Verify it&apos;s you</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We sent a 6-digit code to<br />
                  <span className="text-sky-400 font-semibold">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <OtpInput value={otp} onChange={setOtp} disabled={otpLoading} />
                  {errors.otp && <p className="text-red-400 text-xs mt-3 text-center">{errors.otp}</p>}
                </div>

                <button
                  type="submit" disabled={otpLoading || otp.length < OTP_LENGTH}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
                  onMouseEnter={(e) => { if (!otpLoading && otp.length === OTP_LENGTH) { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {otpLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Verifying…</> : <>Verify & Sign in <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {/* Resend */}
              <div className="mt-5 text-center">
                <p className="text-slate-500 text-xs mb-2">Didn&apos;t receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none"
                  style={{ color: resendCooldown > 0 ? "#475569" : "#38BDF8" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep("login"); setOtp(""); setErrors({}); }}
                className="mt-4 w-full text-center text-sm text-sky-400 hover:text-sky-300 transition-colors font-semibold cursor-pointer outline-none block"
              >
                ← Back to Sign in
              </button>
            </>
          )}

          {/* ── STEP: forgot ────────────────────────────────────────────── */}
          {step === "forgot" && (
            <>
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white mb-1">Forgot password</h2>
                <p className="text-slate-400 text-sm">Enter your email and we&apos;ll send you a secure reset link</p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email address</label>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200" style={fieldStyle("forgotEmail")}>
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

                <button
                  type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {forgotLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Sending…</> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setStep("login"); setErrors({}); }}
                className="mt-6 w-full text-center text-sm text-sky-400 hover:text-sky-300 transition-colors font-semibold cursor-pointer outline-none"
              >
                ← Back to Sign in
              </button>
            </>
          )}

          {/* ── STEP: forgotSent ────────────────────────────────────────── */}
          {step === "forgotSent" && (
            <>
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
                  onClick={() => setStep("forgot")}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer outline-none block"
                >
                  Didn&apos;t receive it? <span className="text-sky-400 font-semibold hover:underline">Resend reset link</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("login"); setErrors({}); }}
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
