"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Wallet, Sparkles } from "lucide-react";

const GithubIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const XIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const LinkedinIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const LINKS = {
  Product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "AI Assistant", href: "/ai" },
    { label: "Group Chat", href: "/groupchat" },
    { label: "Expense Tracking", href: "/dashboard" },
    { label: "Split Calculator", href: "/dashboard" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Social: [
    { label: "Twitter / X", href: "https://twitter.com", icon: XIcon },
    { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
    { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon },
    { label: "GitHub", href: "https://github.com", icon: GithubIcon },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <footer
      className="relative w-full overflow-hidden"
      style={{ background: "#080810" }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">

        {/* Top row: brand + newsletter */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center border border-white/10"
              >
                <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
              </div>
              <span className="text-white font-extrabold text-xl tracking-tight">SplitEase</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed font-medium">
              The smartest way to split expenses with friends, family, and groups — powered by AI.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                { Icon: GithubIcon, href: "https://github.com" },
                { Icon: XIcon, href: "https://twitter.com" },
                { Icon: InstagramIcon, href: "https://instagram.com" },
                { Icon: Mail, href: "mailto:hello@splitease.app" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:scale-110"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.2)";
                    e.currentTarget.style.border = "1px solid rgba(139,92,246,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  }}
                >
                  <Icon className="w-3.5 h-3.5 text-white/50" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="max-w-sm w-full">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Newsletter</p>
            </div>
            <h3 className="text-white font-bold text-lg leading-snug mb-1">
              Get tips on smarter expense splitting
            </h3>
            <p className="text-sm text-white/35 mb-5">No spam. Unsubscribe any time.</p>

            {submitted ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-emerald-400"
                style={{
                  background: "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.25)",
                }}
              >
                ✅ You're on the list — welcome aboard!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(139,92,246,0.5)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
                    boxShadow: "0 0 20px rgba(139,92,246,0.35)",
                  }}
                >
                  Subscribe
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Link columns ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/30 mb-4">
                {category}
              </p>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 text-sm text-white/45 font-medium transition-all hover:text-white group"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />}
                      <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-white/25 font-medium">
            © {new Date().getFullYear()} Hellobj. All rights reserved.
          </p>
       
        </div>
      </div>

      {/* ── Giant faded brand watermark ── */}
      <div
        className="relative w-full overflow-hidden select-none pointer-events-none"
        style={{ height: "clamp(80px, 14vw, 180px)" }}
      >
        <p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 font-black leading-none whitespace-nowrap tracking-tighter"
          style={{
            fontSize: "clamp(80px, 16vw, 200px)",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          SplitEase
        </p>
      </div>
    </footer>
  );
}
