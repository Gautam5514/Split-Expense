"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Loader2, LogIn } from "lucide-react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();

      // 🔥 Sync with backend (ensures Mongo user exists)
      await api.post("/auth/google", { token });

      setToken(token);
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // 🔥 Sync user to MongoDB
      await api.post("/auth/google", { token });

      setToken(token);
      toast.success(`Welcome, ${result.user.displayName || "User"}!`);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Google Sign-In failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-900 border border-gray-800 shadow-2xl rounded-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-emerald-400">Welcome Back</h2>
          <p className="mt-1 text-gray-400 text-sm">
            Login with your account or use Google
          </p>
        </div>

        {/* 🔹 Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Continue with Google</span>
        </button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-800"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-900 px-2 text-gray-500">or sign in</span>
          </div>
        </div>

        {/* 🔹 Email + Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {showPassword ? (
                  <EyeOff
                    className="w-5 h-5 text-gray-400 cursor-pointer"
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <Eye
                    className="w-5 h-5 text-gray-400 cursor-pointer"
                    onClick={() => setShowPassword(true)}
                  />
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 font-medium transition disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" /> Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
