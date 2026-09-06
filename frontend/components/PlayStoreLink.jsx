// Shared "we have an Android app too" link, reused across the marketing
// site (hero, footer, feature pages, pricing/blog/about CTAs) so every
// visitor sees the same Play Store button and icon wired to the same link.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kunal.splitapp";

export function GooglePlayIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="30 336.7 120.9 129.2" className={className} aria-hidden="true">
      <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z" />
      <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z" />
      <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z" />
      <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z" />
    </svg>
  );
}

// Pill button variant — for hero/CTA sections that sit next to a primary
// "Get started" button.
export function PlayStoreButton({ className = "" }) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`clickable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 ${className}`}
    >
      <GooglePlayIcon className="h-5 w-5 shrink-0" />
      Get it on Google Play
    </a>
  );
}

// Compact icon + "Download" label — sized to sit alongside the nav links
// in the navbar so visitors on desktop know there's an Android app too.
// The colorful mark sits in a small dark chip so it reads as a proper app
// icon against the navbar instead of a bare, flat-looking triangle.
export function PlayStoreNavLink({ className = "" }) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Get SplitEase on Google Play"
      className={`group inline-flex items-center gap-2 pl-1 pr-3 sm:pr-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5 ${className}`}
    >
      <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 transition-colors group-hover:bg-white/15 group-hover:ring-white/25">
        <GooglePlayIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      Download
    </a>
  );
}

// Small circular icon-only variant — for the footer's social icons row.
export function PlayStoreIconLink({ className = "" }) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get SplitEase on Google Play"
      title="Get SplitEase on Google Play"
      className={`w-[30px] h-[30px] flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-[#718096] hover:text-white hover:border-white/[0.2] hover:bg-white/[0.05] transition-all duration-300 ${className}`}
    >
      <GooglePlayIcon className="w-3.5 h-3.5" />
    </a>
  );
}
