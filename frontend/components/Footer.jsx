"use client";

import Link from "next/link";

// Custom Security & Compliance Badges matching the Obsidian aesthetic
const GDPRBadge = () => (
  <div className="relative w-[52px] h-[52px] rounded-full border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300">
    <svg className="absolute inset-0 w-full h-full text-white/[0.04] animate-[spin_32s_linear_infinite]" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3, 5" />
    </svg>
    <span className="text-[9px] font-extrabold text-[#A0AEC0] tracking-widest leading-none">GDPR</span>
    <span className="text-[5px] text-[#718096] uppercase tracking-wider font-semibold mt-0.5">Compliant</span>
  </div>
);

const SOC2Badge = () => (
  <div className="relative w-[52px] h-[52px] rounded-full border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300">
    <div className="absolute inset-[3px] rounded-full border border-white/[0.03]" />
    <span className="text-[7px] text-[#718096] font-extrabold tracking-[0.05em] leading-none">AICPA</span>
    <span className="text-[9px] font-extrabold text-[#A0AEC0] tracking-widest mt-0.5 leading-none">SOC 2</span>
    <span className="text-[5px] text-[#718096] uppercase tracking-wider font-semibold mt-0.5 leading-none">Type II</span>
  </div>
);

const ISO27001Badge = () => (
  <div className="relative w-[52px] h-[52px] rounded-full border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300">
    <div className="absolute inset-[3px] rounded-full border border-white/[0.03]" />
    <span className="text-[5px] text-[#718096] font-bold uppercase tracking-wider leading-none">ISO/IEC</span>
    <span className="text-[9px] font-extrabold text-[#A0AEC0] tracking-widest mt-0.5 leading-none">27001</span>
    <span className="text-[5px] text-[#718096] uppercase tracking-wider font-semibold mt-0.5 leading-none">Security</span>
  </div>
);

const ISO22301Badge = () => (
  <div className="relative w-[52px] h-[52px] rounded-full border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300">
    <div className="absolute inset-[3px] rounded-full border border-white/[0.03]" />
    <span className="text-[5px] text-[#718096] font-bold uppercase tracking-wider leading-none">ISO/IEC</span>
    <span className="text-[9px] font-extrabold text-[#A0AEC0] tracking-widest mt-0.5 leading-none">22301</span>
    <span className="text-[5px] text-[#718096] uppercase tracking-wider font-semibold mt-0.5 leading-none">Business</span>
  </div>
);

const PCIDSSBadge = () => (
  <div className="relative w-[52px] h-[52px] rounded-full border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300">
    <div className="absolute inset-[3px] rounded-full border border-white/[0.03]" />
    <span className="text-[8px] font-extrabold text-[#A0AEC0] tracking-wider leading-none">PCI DSS</span>
    <span className="text-[5px] text-[#718096] uppercase tracking-wider font-semibold mt-0.5 leading-none">Certified</span>
  </div>
);

const GithubIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/[0.04] bg-[#030303] pt-16 sm:pt-24 pb-4">
      {/* Dark Subtle Top Ambient Shadow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[120px] opacity-40"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.06) 0%, transparent 68%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-16">
          
          {/* Left Column (Logo, Registry, Badges, Copyright) */}
          <div className="lg:col-span-5 flex flex-col pr-0 lg:pr-10">
            {/* Wordmark Logo */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center bg-white/[0.02] shrink-0">
                <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                splitease
              </span>
            </div>

            {/* Registered Company Info */}
            <p className="text-xs text-[#718096] leading-relaxed max-w-sm">
              SplitEase Technologies Private Limited is a financial software platform registered in India with corporate identification number U6326982. Registered office: 12th Floor, Tech Hub Tower, Outer Ring Road, Bengaluru, Karnataka, 560103.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 mt-7 mb-8">
              <GDPRBadge />
              <SOC2Badge />
              <ISO27001Badge />
              <ISO22301Badge />
              <PCIDSSBadge />
            </div>

            {/* Social Icons Row */}
            <div className="flex items-center gap-3.5 mb-5">
              {[
                { icon: <GithubIcon />, href: "https://github.com" },
                { icon: <XIcon />, href: "https://x.com" },
                { icon: <InstagramIcon />, href: "https://instagram.com" }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-[#718096] hover:text-white hover:border-white/[0.2] hover:bg-white/[0.05] transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Copyright block */}
            <p className="text-[11px] text-[#4A5568] leading-relaxed">
              &copy; {new Date().getFullYear()} SplitEase Technologies Private Limited. SplitEase, SplitEase AI, and their respective logo marks are registered trademarks of SplitEase Technologies.
            </p>
          </div>

          {/* Right Column (3 Columns of Links) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-10 lg:gap-6 pt-2">
            
            {/* Column 1 - Platform Features */}
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A0AEC0] mb-5">
                Features
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "AI Expense Splitter", href: "/ai" },
                  { label: "Smart Settlements", href: "/dashboard" },
                  { label: "OCR Receipt Scan", href: "/dashboard" },
                  { label: "Group Chat Hub", href: "/groupchat" }
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#718096] hover:text-white transition-all duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2 - Company */}
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A0AEC0] mb-5">
                Company
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "Media Center", href: "/contact" },
                  { label: "About Us", href: "/about" },
                  { label: "Careers", href: "/contact" },
                  { label: "Contact Us", href: "/contact" },
                  { label: "LinkedIn", href: "https://linkedin.com", external: true }
                ].map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#718096] hover:text-white transition-all duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-[#718096] hover:text-white transition-all duration-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 - Trust & Security */}
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A0AEC0] mb-5">
                Legal
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "Legal Overview", href: "/privacy" },
                  { label: "Security Center", href: "/privacy" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Settings", href: "/privacy" }
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#718096] hover:text-white transition-all duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Massive Serif Brand Watermark */}
        <div className="w-full select-none pointer-events-none flex items-end justify-center border-t border-white/[0.07] pt-6 pb-2 overflow-hidden">
          <span
            className="font-serif-premium leading-none text-[clamp(70px,15vw,220px)] tracking-tight lowercase select-none bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 90%)",
            }}
          >
            splitease
          </span>
        </div>

      </div>
    </footer>
  );
}
