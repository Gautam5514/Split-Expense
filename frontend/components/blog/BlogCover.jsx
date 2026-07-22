import Image from "next/image";

// Original editorial artwork is paired with the existing data chips and accent
// treatment so the cards still feel native to the SplitEase design system.

export default function BlogCover({ post, compact = false, fill = false }) {
  const { image, alt = "", c1 = "#0891B2", c2 = "#0EA5E9", chips = [], objectPosition } = post.cover || {};
  const gridId = `bg-grid-${post.slug}${compact ? "-c" : fill ? "-f" : ""}`;
  const shownChips = compact ? chips.slice(0, 2) : chips;

  return (
    <div
      aria-label={alt || undefined}
      role={alt ? "img" : undefined}
      className={`relative w-full overflow-hidden bg-[#070707] ${
        fill
          ? "aspect-[16/9] md:aspect-auto md:h-full md:min-h-[320px]"
          : compact
            ? "aspect-[16/8]"
            : "aspect-[16/9] sm:aspect-[21/8]"
      }`}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          priority={fill}
          sizes={fill ? "(min-width: 768px) 560px, 100vw" : compact ? "(min-width: 1024px) 340px, (min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 896px, 100vw"}
          style={objectPosition ? { objectPosition } : undefined}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
        />
      )}

      {/* Dark accent wash keeps chips legible and ties every photo together. */}
      <div
        className="absolute inset-0"
        style={{
          background: image
            ? `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.46)), radial-gradient(60% 90% at 8% 8%, ${c1}28, transparent 72%), radial-gradient(55% 80% at 94% 90%, ${c2}20, transparent 72%)`
            : `radial-gradient(65% 90% at 12% 8%, ${c1}38, transparent 68%), radial-gradient(60% 85% at 88% 92%, ${c2}30, transparent 68%), #070707`,
        }}
      />

      {/* Fine grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.09]">
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

      {/* Fade into the card surface: bottom when stacked, right edge in fill layout */}
      <div
        className={`absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0A0A0A] to-transparent ${
          fill ? "md:hidden" : ""
        }`}
      />
      {fill && (
        <div className="hidden md:block absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0A0A0A] to-transparent" />
      )}
    </div>
  );
}
