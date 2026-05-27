"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Help Center", href: "/help-center" },
  { label: "Contact Us", href: "/contact" },
];

const HIDDEN_ON = ["/", "/login", "/register", "/reset-password", "/chat", "/groupchat", "/ai"];

export default function AppFooter() {
  const pathname = usePathname() || "";

  const shouldHide = HIDDEN_ON.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (shouldHide) return null;

  return (
    <footer className="hidden sm:block border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">

        {/* Brand */}
        <span className="font-extrabold text-foreground text-sm tracking-tight">
          SplitEase
        </span>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-1">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-sm font-medium text-primary whitespace-nowrap">
          © {new Date().getFullYear()} SplitEase Financial. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
