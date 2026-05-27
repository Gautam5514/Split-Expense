"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "@/lib/toast";
import { Eye, EyeOff, User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [errors, setErrors] = useState({});

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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      const firebaseToken = await result.user.getIdToken();
      const res = await api.post("/auth/google", { token: firebaseToken });
      setToken(res.data.token);
      toast.success("Account created successfully!");
      router.push("/users");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else toast.error(data?.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();
      const res = await api.post("/auth/google", { token: firebaseToken });
      setToken(res.data.token);
      toast.success(`Welcome, ${result.user.displayName || "User"}!`);
      router.push("/users");
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
    /* h-[100dvh] + overflow-hidden = zero scroll */
    <div className="auth-page-wrapper h-[100dvh] overflow-hidden flex" style={{ background: "#08080f" }}>

      {/* ── Left visual panel ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full relative overflow-hidden flex-col justify-center px-12 py-8">
        {/* bg */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#032040 0%,#052235 55%,#03101F 100%)" }} />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(8,145,178,1) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* orbs */}
        <div className="absolute w-[440px] h-[440px] rounded-full pointer-events-none" style={{ bottom: "-10%", left: "-5%", background: "radial-gradient(circle,rgba(8,145,178,0.15) 0%,transparent 70%)" }} />
        <div className="absolute w-[320px] h-[320px] rounded-full pointer-events-none" style={{ top: "5%", right: "-5%", background: "radial-gradient(circle,rgba(14,116,144,0.12) 0%,transparent 70%)" }} />

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
            Built for groups,<br />
            <span style={{ background: "linear-gradient(90deg,#22D3EE,#0EA5E9,#38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              loved by friends.
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Join thousands of groups already using Split to manage shared finances with zero drama.
          </p>

          {/* steps */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center`} style={{ boxShadow: `0 4px 14px ${step.glow}` }}>
                    <span className="text-white text-xs font-black">{step.number}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-1/2 top-full -translate-x-1/2 w-px mt-0.5" style={{ height: "16px", background: "linear-gradient(to bottom,rgba(8,145,178,0.4),transparent)" }} />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-white text-sm font-semibold mb-0.5">{step.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* social proof */}
          <div className="mt-6 flex items-center gap-4 rounded-2xl px-4 py-3 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex -space-x-2">
              {avatars.map((a) => (
                <div key={a.label} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#032040]" style={{ background: a.color }}>
                  {a.label}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Join 50,000+ users</p>
              <p className="text-slate-500 text-xs">who already split smarter</p>
            </div>
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

          {/* heading */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-0.5">Create your account</h2>
            <p className="text-slate-400 text-xs">Free forever · No credit card required</p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl font-semibold text-xs text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-4.5 h-4.5" />
            Sign up with Google
          </button>

          {/* divider */}
          <div className="relative my-3.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-[10px] font-medium text-slate-600 uppercase tracking-[0.2em]" style={{ background: "#04111F" }}>
                or sign up with email
              </span>
            </div>
          </div>

          {/* form */}
          <form onSubmit={handleRegister} className="space-y-2.5">
            {/* name */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Full name</label>
              <div className="relative flex items-center rounded-xl border transition-all duration-200"
                style={{
                  background: focused === "name" ? "rgba(8,145,178,0.06)" : "rgba(255,255,255,0.04)",
                  borderColor: errors.name ? "#f87171" : (focused === "name" ? "rgba(8,145,178,0.6)" : "rgba(255,255,255,0.08)"),
                  boxShadow: errors.name ? "0 0 0 3px rgba(248,113,113,0.1)" : (focused === "name" ? "0 0 0 3px rgba(8,145,178,0.1)" : "none"),
                }}>
                <User className="absolute left-4 w-4 h-4 text-slate-600" />
                <input
                  type="text" placeholder="John Doe"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError("name"); }}
                  onFocus={() => setFocused("name")} onBlur={() => setFocused("")}
                  className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-2.5 rounded-xl outline-none text-sm"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.name}</p>}
            </div>

            {/* email */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Email address</label>
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
                  className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-4 py-2.5 rounded-xl outline-none text-sm"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* password */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
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
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                  className="w-full bg-transparent text-white placeholder-slate-700 pl-11 pr-12 py-2.5 rounded-xl outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-600 hover:text-slate-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>}

              {/* strength meter */}
              {password.length > 0 && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= passwordStrength ? strengthColor : "rgba(255,255,255,0.08)" }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] mt-0.5 font-medium transition-colors duration-200" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* submit */}
            <button
              type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 4px 20px rgba(8,145,178,0.35)" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(8,145,178,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {isLoading ? <><Loader2 className="animate-spin w-4 h-4" /> Creating account…</> : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-3 text-center text-[10px] text-slate-600 leading-relaxed">
            By signing up, you agree to our{" "}
            <a href="#" className="text-slate-400 hover:text-slate-300 transition-colors">Terms</a>
            {" "}and{" "}
            <a href="#" className="text-slate-400 hover:text-slate-300 transition-colors">Privacy Policy</a>.
          </p>

          <p className="mt-2.5 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <a href="/login" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
              Sign in →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
