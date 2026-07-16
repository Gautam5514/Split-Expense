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
import { captureReferralFromLocation, getStoredReferralCode, clearStoredReferralCode } from "@/lib/referral";
import AuthVisual from "@/components/AuthVisual";

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
    title: "Airbnb - Miami",
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

// TEMPORARY APP-REVIEW MODE:
// Keep the OTP implementation below for later, but make it impossible to
// enter or render that flow. Email/password currently signs in via Firebase.
const LOGIN_OTP_ENABLED = false;

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

  // If a browser retained the old OTP screen during a deployment, force it
  // back to the direct email/password form while review mode is active.
  useEffect(() => {
    if (!LOGIN_OTP_ENABLED && step === "otp") setStep("login");
  }, [step]);

  // Capture ?ref=CODE for attribution at first-ever signup.
  useEffect(() => {
    captureReferralFromLocation();
  }, []);

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

  const completeEmailLogin = async () => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await result.user.getIdToken();
    await api.post("/auth/google", { token: idToken, referralCode: getStoredReferralCode() }).catch(() => {});
    clearStoredReferralCode();
    toast.success("Login successful!");

    const pendingInvite = localStorage.getItem("pendingInvite");
    if (pendingInvite) {
      localStorage.removeItem("pendingInvite");
      router.push(`/join/${pendingInvite}`);
    } else {
      router.push("/users");
    }
  };

  // ── Email/password login ─────────────────────────────────────────────────
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
      // Firebase validates the email/password and issues the real app token.
      // Login OTP is intentionally disabled, so Nodemailer is not involved.
      await completeEmailLogin();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((p) => ({ ...p, [data.field]: data.message }));
      else if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        setErrors({ password: "Invalid email or password." });
      } else if (err?.code === "auth/too-many-requests") {
        setErrors({ password: "Too many login attempts. Please try again later." });
      } else {
        setErrors({ password: data?.message || err?.message || "Login failed. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP implementation retained for later ────────────────────────────────
  // These handlers are unreachable while LOGIN_OTP_ENABLED is false.
  // Set the flag to true and restore the send step in handleEmailLogin when
  // OTP login is needed again.
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

      // OTP passed - now complete Firebase auth.
      await completeEmailLogin();
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
      await api.post("/auth/google", { token: idToken, referralCode: getStoredReferralCode() }).catch(() => {});
      clearStoredReferralCode();
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
    <div className="auth-page-wrapper h-[100dvh] overflow-hidden flex bg-[#0B0B0B] text-white">

      {/* LEFT PANEL: Form and Branding */}
      <div className="w-full lg:w-[48%] h-full flex flex-col justify-between px-6 sm:px-12 md:px-16 py-8 relative overflow-y-auto bg-[#0A0A0A] border-r border-white/5 custom-scrollbar">
        
        {/* Logo Header */}
        <div className="flex items-center gap-2.5 mt-2 mb-6 justify-center lg:justify-start">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-200 bg-zinc-950 shrink-0">
              <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white font-serif-premium lowercase text-2xl">
              SplitEase
            </span>
          </Link>
        </div>

        {/* Center Content Wrapper */}
        <div className="w-full max-w-[360px] mx-auto my-auto py-6">

          {/* ── STEP: login ─────────────────────────────────────────────── */}
          {step === "login" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Welcome back</h2>
                <p className="text-slate-400 text-sm">Sign in to continue splitting expenses with zero drama.</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm text-white/95 border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all duration-200 cursor-pointer"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-4.5 h-4.5" />
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]" /></div>
                <div className="relative flex justify-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  <span className="px-3 bg-[#0A0A0A]">or</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                {/* Email address */}
                <div>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                    className="w-full bg-[#121212] text-white placeholder-slate-500 px-4 py-3.5 rounded-xl border border-white/10 focus:border-white focus:ring-1 focus:ring-white outline-none text-sm transition-all"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                      className="w-full bg-[#121212] text-white placeholder-slate-500 pl-4 pr-12 py-3.5 rounded-xl border border-white/10 focus:border-white focus:ring-1 focus:ring-white outline-none text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password}</p>}
                </div>

                {/* Continue button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
                >
                  {isLoading ? <Loader2 className="animate-spin w-4.5 h-4.5 text-black" /> : "Continue"}
                </button>
              </form>

              <div className="mt-5 flex justify-between items-center text-xs">
                <p className="text-slate-500">
                  New to SplitEase?{" "}
                  <Link href="/register" className="text-white font-bold hover:underline">Sign up</Link>
                </p>
                <button
                  type="button"
                  onClick={() => { setStep("forgot"); setForgotEmail(""); setErrors({}); }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer outline-none font-bold"
                >
                  Forgot password?
                </button>
              </div>

              <div className="mt-6 border-t border-white/[0.05] pt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-500">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </>
          )}

          {/* ── STEP: otp ───────────────────────────────────────────────── */}
          {LOGIN_OTP_ENABLED && step === "otp" && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.2)" }}>
                  <ShieldCheck className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Verify it's you</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We sent a 6-digit verification code to<br />
                  <span className="text-white font-semibold">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <OtpInput value={otp} onChange={setOtp} disabled={otpLoading} />
                  {errors.otp && <p className="text-red-400 text-xs mt-3 text-center">{errors.otp}</p>}
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otp.length < OTP_LENGTH}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
                >
                  {otpLoading ? <Loader2 className="animate-spin w-4.5 h-4.5 text-black" /> : "Verify & Sign in"}
                </button>
              </form>

              <div className="mt-6 text-center space-y-4">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none"
                    style={{ color: resendCooldown > 0 ? "#64748B" : "#FFF" }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setStep("login"); setOtp(""); setErrors({}); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors font-bold cursor-pointer outline-none"
                >
                  ← Back to Sign in
                </button>
              </div>
            </>
          )}

          {/* ── STEP: forgot ────────────────────────────────────────────── */}
          {step === "forgot" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Forgot password</h2>
                <p className="text-slate-400 text-sm">Enter your email and we'll send you a secure reset link.</p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); clearError("forgotEmail"); }}
                    className="w-full bg-[#121212] text-white placeholder-slate-500 px-4 py-3.5 rounded-xl border border-white/10 focus:border-white focus:ring-1 focus:ring-white outline-none text-sm transition-all"
                  />
                  {errors.forgotEmail && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.forgotEmail}</p>}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
                >
                  {forgotLoading ? <Loader2 className="animate-spin w-4.5 h-4.5 text-black" /> : "Send Reset Link"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setStep("login"); setErrors({}); }}
                className="mt-6 w-full text-center text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer outline-none"
              >
                ← Return to Sign in
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
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Check your inbox</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We sent a password reset link to<br />
                  <span className="text-sky-400 font-semibold">{forgotEmail}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-slate-400 leading-relaxed mb-6 space-y-2">
                <p>• Check your spam folder if you don't see it.</p>
                <p>• The link expires in <span className="text-white font-semibold">15 minutes</span>.</p>
                <p>• You can safely close this tab after resetting.</p>
              </div>

              <div className="space-y-4 text-center">
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer outline-none font-bold block mx-auto"
                >
                  Didn't receive it? <span className="text-white hover:underline">Resend reset link</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("login"); setErrors({}); }}
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors font-bold cursor-pointer outline-none block mx-auto"
                >
                  ← Return to Sign in
                </button>
              </div>
            </>
          )}

        </div>

        {/* Grayscale partner logos */}
        <div className="mt-8 text-center pb-2">
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Trusted by users at</p>
          <div className="flex justify-center items-center gap-6 opacity-30 grayscale filter">
            <img src="/airbnb.png" className="h-3.5 object-contain" alt="Airbnb" />
            <img src="/expedia.png" className="h-3.5 object-contain" alt="Expedia" />
            <img src="/tripadvisor.png" className="h-3.5 object-contain" alt="Tripadvisor" />
            <img src="/skyscanner.png" className="h-3.5 object-contain" alt="Skyscanner" />
          </div>
        </div>

      </div>

      <AuthVisual mode="login" />

    </div>
  );
}
