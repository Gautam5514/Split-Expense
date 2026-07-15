"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "@/lib/toast";
import { Eye, EyeOff, User, Mail, Lock, Loader2, ArrowRight, ShieldCheck, RotateCcw } from "lucide-react";
import { signInWithCustomToken, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { captureReferralFromLocation, getStoredReferralCode, clearStoredReferralCode } from "@/lib/referral";

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
    if (raw.length > 1) {
      const pasted = raw.slice(0, OTP_LENGTH);
      onChange(pasted.padEnd(OTP_LENGTH, "").split("").slice(0, OTP_LENGTH).join(""));
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
          className="w-11 text-center text-xl font-bold text-white rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            height: "52px",
            background: digits[idx] ? "rgba(8,145,178,0.15)" : "rgba(255,255,255,0.04)",
            border: digits[idx] ? "1.5px solid rgba(8,145,178,0.7)" : "1.5px solid rgba(255,255,255,0.1)",
            boxShadow: digits[idx] ? "0 0 0 3px rgba(8,145,178,0.12)" : "none",
            caretColor: "transparent",
          }}
        />
      ))}
    </div>
  );
}

function MarqueeColumn({ images, reverse }) {
  return (
    <div className="w-full flex flex-col gap-6 overflow-hidden h-[180%]">
      <motion.div
        className="flex flex-col gap-6"
        initial={{ y: reverse ? "-50%" : "0%" }}
        animate={{ y: reverse ? "0%" : "-50%" }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 35,
        }}
      >
        {[...images, ...images].map((src, i) => (
          <div
            key={i}
            className="rounded-[24px] overflow-hidden border border-white/[0.08] shadow-2xl bg-[#090D14] aspect-[9/19] w-full"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <img src={src} className="w-full h-full object-cover animate-pulse-slow" alt="App Screen" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    gradient: "from-teal-500 to-cyan-600",
    glow: "rgba(8,145,178,0.35)",
    title: "Create a group",
    desc: "Add your friends, roommates, or travel buddies to a shared group.",
  },
  {
    number: "02",
    gradient: "from-cyan-500 to-sky-600",
    glow: "rgba(8,145,178,0.35)",
    title: "Log expenses",
    desc: "Record who paid and split the bill any way you like.",
  },
  {
    number: "03",
    gradient: "from-sky-500 to-teal-600",
    glow: "rgba(14,165,233,0.35)",
    title: "Settle up",
    desc: "See exactly who owes what and mark debts as paid in one tap.",
  },
];

const avatars = [
  { label: "A", color: "#0891B2" },
  { label: "M", color: "#0E7490" },
  { label: "J", color: "#0EA5E9" },
  { label: "R", color: "#ec4899" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { token, setToken } = useAuth();

  useEffect(() => {
    if (token) router.replace("/users");
  }, [token, router]);

  // Capture ?ref=CODE for attribution at first-ever signup.
  useEffect(() => {
    captureReferralFromLocation();
  }, []);

  // step: "form" | "otp"
  const [step, setStep] = useState("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [errors, setErrors] = useState({});

  // OTP step
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

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

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

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

  const validateRegister = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    else if (name.trim().length > 100) e.name = "Name must be under 100 characters.";
    if (!email.trim()) e.email = "Email address is required.";
    else if (!emailRegex.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password)) e.password = "Password must include at least one uppercase letter (A-Z).";
    else if (!/[0-9]/.test(password)) e.password = "Password must include at least one number (0-9).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 1: validate + send email verification code ──────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setIsLoading(true);
    try {
      // Verify the email is real and unused BEFORE any account exists.
      await api.post("/auth/send-signup-otp", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setOtp("");
      setStep("otp");
      startCooldown();
      toast.success("Verification code sent to your email.");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else toast.error(data?.message || "Couldn't send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: the code proves the inbox; the SERVER creates the account ─────
  // The browser deliberately does not call createUserWithEmailAndPassword here.
  // It hands the code + password to the backend, which only creates the account
  // once the code checks out and returns a custom token to sign in with - so an
  // unverified email can never become an account.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < OTP_LENGTH) {
      setErrors({ otp: "Please enter the complete 6-digit code." });
      return;
    }
    setOtpLoading(true);
    setErrors({});
    try {
      const { data } = await api.post("/auth/verify-signup-otp", {
        email: email.trim(),
        otp,
        password,
        referralCode: getStoredReferralCode(),
      });
      await signInWithCustomToken(auth, data.customToken);
      clearStoredReferralCode();
      toast.success("Account created successfully!");
      const pendingInvite = localStorage.getItem("pendingInvite");
      if (pendingInvite) {
        localStorage.removeItem("pendingInvite");
        router.push(`/join/${pendingInvite}`);
      } else {
        router.push("/users");
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field === "email") {
        // Raced with another signup for the same address - back to the form.
        setStep("form");
        setErrors({ email: data.message });
      } else {
        setErrors({ otp: data?.message || err?.message || "Invalid or expired code. Please try again." });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/send-signup-otp", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setOtp("");
      startCooldown();
      toast.success("New verification code sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend code.");
    }
  };

  const handleGoogleSignup = async () => {
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
      console.error("Google Sign-Up error:", err);
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("auth/unauthorized-domain")) {
        toast.error(
          "Domain Unauthorized! Please add this deployment domain to your Firebase Console under Authentication > Settings > Authorized Domains.",
          { duration: 10000 }
        );
      } else {
        toast.error(err.message || "Google signup failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* ── STEP: form ──────────────────────────────────────────────── */}
          {step === "form" && (
          <>
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Create your account</h2>
            <p className="text-slate-400 text-sm">Free forever · No credit card required</p>
          </div>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignup}
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

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <input
                type="text"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError("name"); }}
                className="w-full bg-[#121212] text-white placeholder-slate-500 px-4 py-3.5 rounded-xl border border-white/10 focus:border-white focus:ring-1 focus:ring-white outline-none text-sm transition-all"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.name}</p>}
            </div>

            {/* Email Address */}
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
                  placeholder="Create password"
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

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2.5 px-1">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= passwordStrength ? strengthColor : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-[10px] mt-1.5 font-bold transition-colors duration-200"
                    style={{ color: strengthColor }}
                  >
                    Strength: {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
            >
              {isLoading ? <Loader2 className="animate-spin w-4.5 h-4.5 text-black" /> : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs">
            <p className="text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-white font-bold hover:underline">Sign in</Link>
            </p>
          </div>

          <div className="mt-6 border-t border-white/[0.05] pt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          </>
          )}

          {/* ── STEP: otp ───────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.2)" }}>
                  <ShieldCheck className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Verify your email</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We sent a 6-digit code to<br />
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
                  {otpLoading ? <Loader2 className="animate-spin w-4.5 h-4.5 text-black" /> : "Verify & Create account"}
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
                  onClick={() => { setStep("form"); setOtp(""); setErrors({}); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors font-bold cursor-pointer outline-none"
                >
                  ← Back
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

      {/* RIGHT PANEL: Isometric Scrolling Collage */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden bg-[#070707]">
        {/* Dark overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-transparent to-black/90 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#070707_100%)] z-10 pointer-events-none" />

        {/* Skewed screen columns marquee */}
        <div 
          className="absolute w-[140%] h-[140%] -top-[20%] -left-[20%] grid grid-cols-3 gap-6 opacity-60 pointer-events-none select-none"
          style={{
            transform: "rotate(-25deg) skewX(-2deg) translateY(-80px)",
          }}
        >
          <MarqueeColumn images={["/mobile.png", "/mobile.png", "/mobile.png"]} reverse={false} />
          <MarqueeColumn images={["/mobile.png", "/mobile.png", "/mobile.png"]} reverse={true} />
          <MarqueeColumn images={["/mobile.png", "/mobile.png", "/mobile.png"]} reverse={false} />
        </div>
      </div>

    </div>
  );
}
