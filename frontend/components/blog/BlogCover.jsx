// Generated cover art for blog posts: pure CSS/SVG drawn from each post's
// accent colors, so every article gets a unique, on-brand banner with zero
// image downloads. Server-safe (no client hooks).

export default function BlogCover({ post, compact = false }) {
  const { c1 = "#0891B2", c2 = "#0EA5E9", chips = [] } = post.cover || {};
  const gridId = `bg-grid-${post.slug}${compact ? "-c" : ""}`;
  const shownChips = compact ? chips.slice(0, 2) : chips;

  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden bg-[#070707] ${
        compact ? "aspect-[16/8]" : "aspect-[16/9] sm:aspect-[21/8]"
      }`}
    >
      {/* Accent gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(65% 90% at 12% 8%, ${c1}38, transparent 68%), radial-gradient(60% 85% at 88% 92%, ${c2}30, transparent 68%), radial-gradient(40% 55% at 55% 45%, ${c1}14, transparent 70%), #070707`,
        }}
      />

      {/* Fine grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.14]">
        <defs>
          <pattern id={gridId} width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>

      {/* Diagonal light beam */}
      <div
        className="absolute -inset-y-1/2 left-[30%] w-[26%] rotate-[24deg]"
        style={{ background: `linear-gradient(90deg, transparent, ${c2}12, transparent)` }}
      />

      {/* Category watermark */}
      <span
        className={`font-serif-premium pointer-events-none absolute -bottom-3 right-3 select-none leading-none text-white/[0.06] ${
          compact ? "text-[3.2rem]" : "text-[4rem] sm:text-[6rem]"
        }`}
      >
        {post.category}
      </span>

      {/* Floating glass chips */}
      {shownChips.map((chip, i) => (
        <span
          key={chip}
          className={`absolute inline-flex items-center rounded-full border border-white/15 bg-white/[0.07] font-bold text-white/85 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md ${
            compact ? "px-2.5 py-1 text-[9.5px]" : "px-3 py-1.5 text-[10.5px] sm:px-4 sm:py-2 sm:text-[12px]"
          }`}
          style={[
            { top: "18%", left: "6%", transform: "rotate(-4deg)" },
            compact
              ? { bottom: "18%", left: "24%", transform: "rotate(2deg)" }
              : { top: "42%", right: "8%", transform: "rotate(3deg)" },
            { bottom: "16%", left: "14%", transform: "rotate(2deg)" },
          ][i]}
        >
          {chip}
        </span>
      ))}

      {/* Bottom fade into the card below */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </div>
  );
}
