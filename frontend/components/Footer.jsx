"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Sparkles } from "lucide-react";

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

const LINKS = {
  Product: [
    { label: "Dashboard",         href: "/dashboard" },
    { label: "AI Assistant",      href: "/ai" },
    { label: "Group Chat",        href: "/groupchat" },
    { label: "Expense Tracking",  href: "/dashboard" },
  ],
  Company: [
    { label: "About Us",  href: "/about" },
    { label: "Blog",      href: "/blog" },
    { label: "Contact",   href: "/contact" },
  ],
  Social: [
    { label: "Twitter / X", href: "https://twitter.com",   icon: XIcon },
    { label: "Instagram",   href: "https://instagram.com", icon: InstagramIcon },
    { label: "GitHub",      href: "https://github.com",    icon: GithubIcon },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy",    href: "/cookies" },
  ],
};

export default function Footer() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <footer className="relative w-full overflow-hidden border-t border-border bg-card">

      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Soft glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(8,145,178,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-8">

        {/* Brand + newsletter row */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-14">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-border flex items-center justify-center">
                <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
              </div>
              <span className="font-extrabold text-xl text-foreground tracking-tight">SplitEase</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The smartest way to split expenses with friends, family, and groups — powered by AI.
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              {[
                { Icon: GithubIcon,    href: "https://github.com" },
                { Icon: XIcon,         href: "https://twitter.com" },
                { Icon: InstagramIcon, href: "https://instagram.com" },
                { Icon: Mail,          href: "mailto:hello@splitease.app" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="max-w-sm w-full">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Newsletter</p>
            </div>
            <h3 className="text-foreground font-bold text-lg leading-snug mb-1">
              Get tips on smarter expense splitting
            </h3>
            <p className="text-sm text-muted-foreground mb-5">No spam. Unsubscribe any time.</p>

            {submitted ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                You&apos;re on the list — welcome aboard!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all flex-shrink-0"
                >
                  Subscribe
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground/60 mb-4">
                {category}
              </p>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 text-sm text-muted-foreground font-medium hover:text-foreground group transition-colors"
                    >
                      {Icon && (
                        <Icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                      <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} SplitEase Financial. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/50 font-medium">
            Built with ♥ for travelers everywhere
          </p>
        </div>
      </div>

      {/* Giant watermark */}
      <div
        className="relative w-full overflow-hidden select-none pointer-events-none"
        style={{ height: "clamp(60px, 10vw, 140px)" }}
      >
        <p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 font-black leading-none whitespace-nowrap tracking-tighter"
          style={{
            fontSize: "clamp(70px, 14vw, 180px)",
            background: "linear-gradient(to bottom, rgba(8,145,178,0.09) 0%, transparent 100%)",
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
