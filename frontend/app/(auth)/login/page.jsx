"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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
    gradient: "from-violet-400 to-purple-500",
    title: "Airbnb — Miami",
    meta: "Maya paid · 5 people",
    amount: "$620.00",
    amountColor: "text-violet-400",
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

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");

  // Forgot password flow states
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [simulatedMail, setSimulatedMail] = useState(null);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      toast.success("Reset link generated!");
      setSimulatedMail({
        email: forgotEmail,
        token: res.data.token,
        resetUrl: res.data.resetUrl,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate reset link.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseToken = await result.user.getIdToken();
      const res = await api.post("/auth/google", { token: firebaseToken });
      setToken(res.data.token);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();
      const res = await api.post("/auth/google", { token: firebaseToken });
      setToken(res.data.token);
      toast.success(`Welcome, ${result.user.displayName || "User"}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error("Google Sign-In failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* h-screen + overflow-hidden = zero scroll */
    <div className="h-screen overflow-hidden flex" style={{ background: "#08080f" }}>

      {/* ── Left visual panel ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden flex-col justify-center px-12 py-8">
        {/* bg */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0f0c29 0%,#1a0533 50%,#0c1445 100%)" }} />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* orbs */}
        <div className="absolute w-[460px] h-[460px] rounded-full pointer-events-none" style={{ top: "5%", left: "-10%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)" }} />
        <div className="absolute w-[360px] h-[360px] rounded-full pointer-events-none" style={{ bottom: "0%", right: "-5%", background: "radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%)" }} />

        <div className="relative z-10 max-w-[400px]">
          {/* logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
              <span className="text-white text-lg font-black">S</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">Split</span>
          </div>

          {/* headline */}
          <h1 className="text-[2.2rem] font-extrabold text-white leading-[1.15] mb-3">
            Share expenses,<br />
            <span style={{ background: "linear-gradient(90deg,#818cf8,#a78bfa,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
      <div className="flex-1 h-full flex flex-col justify-center items-center px-6 lg:px-10 overflow-hidden relative" style={{ background: "#0d0d18" }}>
        <div className="w-full max-w-[380px] py-4">
          {/* mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <span className="text-white font-black">S</span>
            </div>
            <span className="text-xl font-black text-white">Split</span>
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
                      background: focused === "email" ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: focused === "email" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)",
                      boxShadow: focused === "email" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                    }}>
                    <Mail className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type="email" placeholder="you@example.com" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-3 rounded-xl outline-none text-sm"
                    />
                  </div>
                </div>

                {/* password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotFlow(true);
                        setSimulatedMail(null);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border transition-all duration-200"
                    style={{
                      background: focused === "password" ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: focused === "password" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)",
                      boxShadow: focused === "password" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                    }}>
                    <Lock className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type={showPassword ? "text" : "password"} placeholder="••••••••" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-12 py-3 rounded-xl outline-none text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-600 hover:text-slate-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* submit */}
                <button
                  type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {isLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Create one free →
                </a>
              </p>
            </>
          ) : (
            <>
              {/* heading */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Forgot password</h2>
                <p className="text-slate-400 text-sm">Reset your password via simulated secure token link</p>
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
                      background: focused === "email" ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
                      borderColor: focused === "email" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)",
                      boxShadow: focused === "email" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                    }}>
                    <Mail className="absolute left-4 w-4 h-4 text-slate-600" />
                    <input
                      type="email" placeholder="you@example.com" required
                      value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                      className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-3 rounded-xl outline-none text-sm"
                    />
                  </div>
                </div>

                {/* submit */}
                <button
                  type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {forgotLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Generating Link…</> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsForgotFlow(false);
                  setSimulatedMail(null);
                }}
                className="mt-6 w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-semibold cursor-pointer outline-none"
              >
                ← Back to Sign in
              </button>
            </>
          )}
        </div>

        {/* 📬 Simulated Mail Server Overlay Panel */}
        {simulatedMail && (
          <div className="fixed bottom-6 right-6 z-[9999] w-[350px] max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-500/30 bg-zinc-950/95 p-4 shadow-[0_8px_32px_rgba(99,102,241,0.35)] backdrop-blur-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-5 text-white">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">📬 Local Mail Simulator</span>
              </div>
              <button 
                onClick={() => setSimulatedMail(null)} 
                className="text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="text-white/60">
                <span className="font-semibold text-white/90">To:</span> {simulatedMail.email}
              </div>
              <div className="text-white/60">
                <span className="font-semibold text-white/90">Subject:</span> Reset your SplitEase Password
              </div>
              
              <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] leading-relaxed text-white/80 text-[11px]">
                <p className="mb-1 font-medium text-white">Hello,</p>
                <p className="mb-3 text-slate-300">We received a request to reset your SplitEase account password. Click the button below to recover your account:</p>
                
                <a 
                  href={simulatedMail.resetUrl}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 py-2.5 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer text-center"
                >
                  Reset Password Now
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
