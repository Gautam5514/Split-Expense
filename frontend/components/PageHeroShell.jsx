/* Shared hero backdrop for the marketing sub-pages (blog, pricing, what we
   offer): the same warm gradient, bottom fade and flanking stones as the
   landing hero. Each page passes its own text as children and its own
   padding via `className`. */
export default function PageHeroShell({ as: Tag = "section", className = "", fadeBottom = false, children }) {
  return (
    <Tag className={`relative flex w-full flex-col items-center overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(180deg, #000 0%, #2F2C2A 67%)" }} />
      <div
        className="pointer-events-none absolute -left-[218px] -right-[218px] bottom-0 top-[45%] z-[4]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 83.35%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-6 md:px-8">{children}</div>

      <picture>
        <source srcSet="/stone-left.webp" type="image/webp" />
        <img
          src="/stone-left.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute bottom-[-220px] left-[-160px] z-[5] size-[620px] max-w-none max-lg:bottom-[-140px] max-lg:left-[-120px] max-lg:size-[440px] max-md:bottom-[-60px] max-md:left-[-12%] max-md:size-[280px]"
        />
      </picture>
      <picture>
        <source srcSet="/stone-right.webp" type="image/webp" />
        <img
          src="/stone-right.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute bottom-[-260px] right-[-640px] z-[5] h-[720px] w-[1150px] max-w-none max-lg:bottom-[-170px] max-lg:right-[-460px] max-lg:h-[520px] max-lg:w-[830px] max-md:bottom-[-60px] max-md:right-[-180px] max-md:size-[380px]"
        />
      </picture>
      {/* Pages whose content does not overlap the hero get a soft fade so the
          stones dissolve instead of ending on a hard edge. */}
      {fadeBottom && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-40 bg-gradient-to-b from-transparent to-black" />}
    </Tag>
  );
}
