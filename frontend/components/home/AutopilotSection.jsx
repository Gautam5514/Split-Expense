"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

/* Home-page Autopilot showcase: a scroll story in three beats, on one white
   card that cools into a grainy brand-cyan gradient towards the bottom.

   1. The headline, and under it one colourful object: the Autopilot mask.
   2. As you scroll, the mask pins in the viewport and shrinks to 58% while a
      portrait rises up underneath it, still only a silhouette.
   3. The mask lands on the eyes. The silhouette becomes the real portrait,
      the labels decode letter by letter and their lines draw themselves.
      Scrolling back up undoes it.

   The pin is plain CSS: the mask is `position: sticky` inside a tall,
   invisible track that ends exactly on its slot over the eyes, so it lands
   there without measuring. JS only reads how far along the track we are, to
   drive the scale and to know when it has landed.

   All sizes are in `--u`, one hundredth of the card's width on desktop, so
   the mask stays on the eyes at every screen size. Below `lg`, and for
   reduced motion, there is no flight: the mask is already on.

   The character is a transparent studio portrait (HybridFigure): half human, half machine.
   PHOTO describes the canvas and pupil positions so the mask can land
   independently of the portrait. */

// Measured on the transparent portrait; the mask derives its landing slot from these pupils.
const PHOTO = { w: 1487, h: 1058, eyeX: 743.5, eyeY: 415, eyeGap: 217 };

const PHOTO_W = 65; // how wide the portrait is drawn, in --u
const SCENE_H = 62;
const ROOM = 30; // empty space under the buttons where the big mask first sits
const START_SCALE = 1.72; // ends at 1, i.e. the mask shrinks to 58%
const PIN_AT = 0.4; // pinned this far down the viewport (fraction of its height)

// Everything below follows from the numbers above.
const K = PHOTO_W / PHOTO.w; // photo pixels -> --u
const PHOTO_H = PHOTO.h * K;
const PHOTO_LEFT = -PHOTO.eyeX * K; // puts the eyes on the card's centre line
const EYE_Y = SCENE_H - PHOTO_H + PHOTO.eyeY * K; // the portrait stands on the scene's bottom edge
const MASK_W = (PHOTO.eyeGap * K) / 0.4476; // the mask's eye holes are 44.76% of its width apart
const MASK_H = (MASK_W * 200) / 420;
const SLOT_TOP = EYE_Y - MASK_H * 0.48; // the holes sit 48% down the mask
const TRAVEL = SLOT_TOP + ROOM / 2 + MASK_H / 2; // from the room's middle to the slot

const u = (n) => `calc(var(--u) * ${n})`;

/* `tip` is the height (in --u) the line points at, `gap` how far from the
   centre line its tip ends. 46px is the label's own height above its tip. */
const CALLOUTS = [
  {
    key: "yes",
    side: "left",
    tip: 31,
    gap: 10.5,
    label: "Waits for your yes",
    detail: "Nothing changes until you approve",
  },
  {
    key: "money",
    side: "right",
    tip: 49,
    gap: 15,
    label: "Never moves money",
    detail: "It plans and records. Paying stays with you",
  },
].map((c) => ({ ...c, top: `calc(${u(c.tip)} - 74px)`, gap: u(c.gap) }));

// Shown as a list under the scene on small screens.
const POINTS = [
  ...CALLOUTS,
  {
    key: "lang",
    label: "English + Hinglish",
    detail: "Type it the way you'd text a friend",
  },
  {
    key: "shares",
    label: "Every share, up front",
    detail: "See who pays what before anything is saved",
  },
];

export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.45  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BRAND_GRAIN = GRAIN.replace(
  "0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.45",
  "0 0 0 0 0.03  0 0 0 0 0.36  0 0 0 0 0.46",
);

export default function AutopilotSection() {
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const maskRef = useRef(null);
  const progress = useMotionValue(0);
  const [landed, setLanded] = useState(false);
  const [wide, setWide] = useState(true); // lg and up: the only place the flight runs

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // How far the pinned mask is along its track: 0 = just pinned, 1 = landed.
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const track = trackRef.current;
      const mask = maskRef.current;
      if (!track || !mask || track.offsetParent === null) return; // hidden below lg
      const rect = track.getBoundingClientRect();
      const span = rect.height - mask.offsetHeight;
      if (span <= 0) return;
      const p = Math.min(
        1,
        Math.max(0, (window.innerHeight * PIN_AT - rect.top) / span),
      );
      progress.set(p);
      // Hysteresis, so it does not flicker around the landing point.
      setLanded((was) => (was ? p > 0.9 : p >= 0.985));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce, progress]);

  const scale = useTransform(progress, [0, 1], [START_SCALE, 1]);

  // The card arrives as a full-width white sheet and tucks in to its real
  // width as it scrolls up: 0 = full bleed, 1 = the card.
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 0.22"],
  });
  const tuck = useTransform(scrollYProgress, [0.12, 1], [0, 1], {
    clamp: true,
  });

  const fly = !reduce;
  const shown = landed || !!reduce || !wide;
  const slot = { left: "50%", width: u(MASK_W) };
  const photoBox = {
    left: `calc(50% + ${u(PHOTO_LEFT)})`,
    bottom: 0,
    width: u(PHOTO_W),
    aspectRatio: `${PHOTO.w} / ${PHOTO.h}`,
  };

  return (
    <section
      ref={sectionRef}
      className="overflow-x-clip bg-[#030303] px-3 py-16 sm:px-5 sm:py-24"
      aria-labelledby="autopilot-home-title"
    >
      <div className="@container relative mx-auto max-w-7xl [--pad:4rem] [--rad:1rem] sm:[--pad:6rem]">
        {/* The full-bleed sheet behind the card. It is the card's height plus the
          section's top padding and as wide as the screen; its clip closes in
          until it is exactly the card, which then hides it. */}
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute bottom-0 left-1/2 top-[calc(var(--pad)*-1)] w-screen -translate-x-1/2 bg-white"
            style={{
              "--p": tuck,
              clipPath:
                "inset(calc(var(--pad) * var(--p)) calc((100vw - 100cqw) / 2 * var(--p)) 0 round calc(var(--rad) * var(--p)))",
            }}
            aria-hidden="true"
          />
        )}
        {/* overflow-clip, not hidden: hidden would make this a scroll container and break the sticky mask */}
        <div className="@container relative overflow-clip rounded-2xl bg-white">
          {/* copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 mx-auto max-w-[940px] px-5 pt-16 text-center sm:pt-24 lg:pt-28"
          >
            <h2
              id="autopilot-home-title"
              className="bg-gradient-to-r from-[#202020] to-[#8f8f8f] bg-clip-text pb-2 text-[2.5rem] font-bold leading-[1.05] tracking-[-0.04em] text-transparent sm:text-6xl lg:text-[4.75rem]"
            >
              Say it once.
              <br />
              Autopilot does the rest.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#202020]/60 sm:text-lg">
              Tell SplitEase what you need in plain words. Autopilot lays out a
              plan with everyone&apos;s share, and changes nothing until you say
              yes.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#202020] px-5 py-3.5 text-[15px] font-semibold text-white transition-opacity duration-100 hover:opacity-85"
              >
                Try Autopilot free{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/features/autopilot"
                className="inline-flex items-center rounded-xl bg-[#f0f0f0] px-5 py-3.5 text-[15px] font-semibold text-[#202020] transition-colors duration-200 hover:bg-[#e6e6e6]"
              >
                Learn more
              </Link>
            </div>
          </motion.div>

          <div className="mt-8 [--u:1.5cqw] lg:mt-0 lg:[--u:1cqw]">
            {/* the empty room where the big mask first sits (desktop flight only) */}
            {fly && (
              <div className="hidden lg:block" style={{ height: u(ROOM) }} />
            )}

            <div className="relative" style={{ height: u(SCENE_H) }}>
              {/* gradient, glow and grain */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(236,254,255,0), rgba(8,145,178,0.3))",
                }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(38% 46% at 50% 62%, rgba(255,255,255,0.6) 0%, transparent 100%)",
                }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 opacity-50 mix-blend-multiply"
                style={{
                  backgroundImage: BRAND_GRAIN,
                  maskImage:
                    "linear-gradient(to bottom, transparent 5%, #000 70%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 5%, #000 70%)",
                }}
                aria-hidden="true"
              />

              {/* big blurred words behind the portrait */}
              <div
                className="pointer-events-none absolute inset-0 hidden select-none font-mono font-medium uppercase text-[#164e63]/70 lg:block"
                aria-hidden="true"
              >
                <span
                  className="absolute blur-[3px]"
                  style={{
                    top: u(24),
                    left: `calc(50% + ${u(11.5)})`,
                    fontSize: u(3.2),
                    lineHeight: 1.25,
                  }}
                >
                  <Scramble text="Auto" active={shown} />
                  <br />
                  <Scramble text="pilot" active={shown} delay={100} />
                </span>
                <span
                  className="absolute blur-[3px]"
                  style={{
                    top: u(42),
                    right: `calc(50% + ${u(13)})`,
                    fontSize: u(3.2),
                    lineHeight: 1.25,
                  }}
                >
                  <Scramble text="Say it" active={shown} delay={200} />
                  <br />
                  <Scramble text="once" active={shown} delay={300} />
                </span>
              </div>

              {/* the character: a silhouette first, the real thing once the mask is on */}
              <div
                className="absolute hidden mix-blend-overlay brightness-0 lg:block"
                style={photoBox}
                aria-hidden="true"
              >
                <HybridFigure />
              </div>
              <div
                className={`absolute transition-opacity duration-500 ease-out ${shown ? "" : "opacity-0"}`}
                style={photoBox}
              >
                <div className="absolute inset-0">
                  <HybridFigure />
                </div>
              </div>

              {CALLOUTS.map((c, i) => (
                <Callout
                  key={c.key}
                  callout={{ ...c, detail: null }}
                  index={i}
                  gap={c.gap}
                  active={shown}
                />
              ))}

              {/* the mask, already on: mobile, and reduced motion */}
              <div
                className={`absolute -translate-x-1/2 ${fly ? "lg:hidden" : ""}`}
                style={{ ...slot, top: u(SLOT_TOP) }}
              >
                <AutopilotMask />
              </div>

              {/* the flying mask: sticky inside a track that ends on the slot */}
              {fly && (
                <div
                  ref={trackRef}
                  className="pointer-events-none absolute z-20 hidden -translate-x-1/2 lg:block"
                  style={{
                    ...slot,
                    top: u(SLOT_TOP - TRAVEL),
                    height: u(TRAVEL + MASK_H),
                  }}
                  aria-hidden="true"
                >
                  <motion.div
                    ref={maskRef}
                    className="sticky"
                    style={{
                      top: `${PIN_AT * 100}vh`,
                      scale,
                      willChange: "transform",
                    }}
                  >
                    <AutopilotMask />
                  </motion.div>
                </div>
              )}
            </div>

            {/* the points as a plain list (mobile / tablet) */}
            <ul className="relative grid grid-cols-2 gap-x-5 gap-y-5 bg-[#b5dfe8] px-5 pb-8 pt-6 lg:hidden">
              {POINTS.map((c) => (
                <li key={c.key}>
                  <p className="border-b border-[#202020]/30 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#202020]">
                    {c.label}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#202020]/60">
                    {c.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Transparent studio portrait. Its measured pupils above keep the independent
   flying mask aligned without baking the mask into the character artwork. */
function HybridFigure() {
  return (
    <Image
      src="/autopilot-hybrid-v2.webp"
      alt=""
      width={PHOTO.w}
      height={PHOTO.h}
      sizes="(max-width: 1023px) 98vw, (max-width: 1280px) 65vw, 832px"
      className="block h-auto w-full"
      aria-hidden="true"
    />
  );
}

/* The Autopilot visor, drawn in code. It is half and half, like the face it
   lands on: a soft-square wire spectacle lens for the human side, an angular lens
   with a live iris for the machine side. The two lens centres are where the
   layout expects the pupils. */
function AutopilotMask() {
  // Two can be on the page (the flying one and the static one), so ids must be unique:
  // a gradient defined inside a hidden svg does not paint.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = (name) => `url(#apv-${name}-${id})`;
  const tech = "M258 46H350L370 66V126L350 146H258L238 126V66Z";
  const spin =
    "origin-center [transform-box:fill-box] motion-safe:animate-[spin_14s_linear_infinite]";

  return (
    <svg
      viewBox="0 0 420 200"
      className="block h-auto w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`apv-gold-${id}`}
          x1="60"
          y1="40"
          x2="172"
          y2="152"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F6E3B4" />
          <stop offset="0.45" stopColor="#B98A3E" />
          <stop offset="1" stopColor="#6E4E1C" />
        </linearGradient>
        <linearGradient
          id={`apv-clear-${id}`}
          x1="60"
          y1="50"
          x2="172"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#FFD9B0" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient
          id={`apv-steel-${id}`}
          x1="0"
          y1="40"
          x2="0"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#566072" />
          <stop offset="0.4" stopColor="#1C212B" />
          <stop offset="1" stopColor="#07090D" />
        </linearGradient>
        <linearGradient
          id={`apv-screen-${id}`}
          x1="240"
          y1="46"
          x2="370"
          y2="146"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#06283A" stopOpacity="0.86" />
          <stop offset="0.6" stopColor="#0A1030" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2A1458" stopOpacity="0.86" />
        </linearGradient>
        <radialGradient
          id={`apv-iris-${id}`}
          cx="304"
          cy="96"
          r="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#67E8F9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#67E8F9" stopOpacity="0" />
        </radialGradient>
        <filter
          id={`apv-drop-${id}`}
          x="-20%"
          y="-30%"
          width="140%"
          height="200%"
        >
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="10"
            floodColor="#0B1030"
            floodOpacity="0.3"
          />
        </filter>
        <filter
          id={`apv-glow-${id}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`apv-clip-${id}`}>
          <path d={tech} />
        </clipPath>
      </defs>

      <g filter={g("drop")}>
        {/* human side: a soft-square wire lens the size of the machine one, clear glass,
            with an arm that reaches back to the ear */}
        <path
          d="M57 90L10 97"
          stroke={g("gold")}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <rect
          x="56"
          y="50"
          width="120"
          height="100"
          rx="42"
          fill={g("clear")}
        />
        <path
          d="M70 84L88 62M76 96L84 86"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <rect
          x="56"
          y="50"
          width="120"
          height="100"
          rx="42"
          fill="none"
          stroke={g("gold")}
          strokeWidth="4"
        />
        <rect
          x="58.6"
          y="52.6"
          width="114.8"
          height="94.8"
          rx="39.5"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
        {/* nose pad */}
        <path
          d="M172 118C178 122 181 130 179 138"
          fill="none"
          stroke={g("gold")}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* the bridge: wire turning into machine at the seam */}
        <path
          d="M175 82C188 73 200 72 210 74"
          fill="none"
          stroke={g("gold")}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M210 68H240V84H210Z" fill={g("steel")} />

        {/* machine side: an angular lens with a live iris */}
        <path d="M368 80H396V112H368Z" fill={g("steel")} />
        <path d={tech} fill={g("screen")} />
      </g>
      <g clipPath={g("clip")}>
        <circle cx="304" cy="96" r="46" fill={g("iris")} />
        <path
          d="M238 70H370M238 83H370M238 109H370M238 122H370"
          stroke="#67E8F9"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
        <g fill="none" strokeLinecap="round">
          <circle
            cx="304"
            cy="96"
            r="36"
            stroke="#67E8F9"
            strokeOpacity="0.9"
            strokeWidth="1.6"
            strokeDasharray="2 9 26 9"
            className={spin}
          />
          <circle
            cx="304"
            cy="96"
            r="25"
            stroke="#C4B5FD"
            strokeOpacity="0.9"
            strokeWidth="1.4"
            strokeDasharray="40 12"
            className={`${spin} [animation-direction:reverse] [animation-duration:9s]`}
          />
          <circle
            cx="304"
            cy="96"
            r="13"
            stroke="#fff"
            strokeOpacity="0.9"
            strokeWidth="1.6"
          />
        </g>
        <circle cx="304" cy="96" r="7" fill="#67E8F9" filter={g("glow")} />
        <circle cx="304" cy="96" r="3.4" fill="#fff" />
        <path d="M238 46H310L270 146H238Z" fill="#fff" fillOpacity="0.07" />
      </g>
      <path
        d={tech}
        fill="none"
        stroke={g("steel")}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d={tech}
        fill="none"
        stroke="#67E8F9"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* the seam, and a status light */}
      <path
        d="M210 62V90"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="225" cy="76" r="5" fill="#22D3EE" filter={g("glow")} />
      <circle cx="225" cy="76" r="2.4" fill="#CFFAFE" />
      <circle cx="382" cy="96" r="2.2" fill="#4ADE80" />
    </svg>
  );
}

/* Decoding text: when `active` flips on, each letter cycles through random
   symbols and settles, left to right. Flipping off clears it again. */
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#";

function Scramble({ text, active, delay = 0 }) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (reduce) return;
    if (!active) {
      setOut("");
      return;
    }
    const pick = () =>
      SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    // each letter starts and settles at its own frame, earlier letters first
    const plan = [...text].map((ch, i) => {
      const start = Math.floor(i * 1.2 + Math.random() * 6);
      return {
        ch,
        start,
        end: start + 8 + Math.floor(Math.random() * 14),
        cur: pick(),
      };
    });
    let frame = 0;
    let raf = 0;
    const tick = () => {
      let done = 0;
      let s = "";
      for (const q of plan) {
        if (q.ch === " ") {
          s += " ";
          done++;
        } else if (frame >= q.end) {
          s += q.ch;
          done++;
        } else if (frame >= q.start) {
          if (Math.random() < 0.28) q.cur = pick();
          s += q.cur;
        }
      }
      setOut(s);
      frame++;
      if (done < plan.length) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [active, reduce, text, delay]);

  // The real text stays in the layout (invisible) so nothing shifts while it decodes.
  return (
    <span className="relative inline-block">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0 whitespace-pre" aria-hidden="true">
        {reduce ? text : out}
      </span>
    </span>
  );
}

/* A label on a rule, with a diagonal running from the rule's inner end towards
   the subject. Shared with ShadowSection.
   `gap`: how far from the centre line the diagonal's tip ends.
   `active` undefined: fades in once when scrolled into view.
   `active` boolean: the parent decides; the label decodes and the line draws. */
export function Callout({
  callout,
  index,
  dark = false,
  active,
  gap = "182px",
}) {
  const left = callout.side === "left";
  const controlled = active !== undefined;
  const on = controlled ? active : true;
  const wait = controlled ? 0.1 * index : 0;
  const pos = left
    ? { right: `calc(50% + ${gap})` }
    : { left: `calc(50% + ${gap})` };
  const ink = dark ? "#fff" : "#202020";
  const lineOpacity = dark ? 0.5 : 0.55;

  const wrapper = controlled
    ? {
        initial: false,
        animate: { opacity: on ? 1 : 0 },
        transition: { duration: 0.4 },
      }
    : {
        initial: { opacity: 0, x: left ? -14 : 14 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: {
          duration: 0.5,
          delay: 0.45 + index * 0.12,
          ease: "easeOut",
        },
      };

  return (
    <motion.div
      {...wrapper}
      className="absolute hidden lg:block"
      style={{ top: callout.top, ...pos }}
    >
      <div className={left ? "mr-[60px]" : "ml-[60px]"}>
        <div className="relative">
          <p
            className={`whitespace-nowrap pb-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] ${dark ? "text-white/85" : "text-[#16122B]/85"}`}
          >
            {controlled ? (
              <Scramble text={callout.label} active={on} delay={index * 100} />
            ) : (
              callout.label
            )}
          </p>
          {/* the rule, drawn from the outer end towards the subject */}
          <motion.span
            className={`absolute bottom-0 left-0 block h-px w-full ${left ? "origin-left" : "origin-right"}`}
            style={{ background: ink, opacity: lineOpacity }}
            initial={false}
            animate={{ scaleX: on ? 1 : 0 }}
            transition={{
              duration: on ? 0.8 : 0.2,
              delay: on ? 0.4 + wait : 0,
              ease: "easeOut",
            }}
          />
          <svg
            width="60"
            height="46"
            viewBox="0 0 60 46"
            fill="none"
            className={`absolute top-full -mt-px ${left ? "left-full" : "right-full"}`}
            aria-hidden="true"
          >
            <motion.path
              d={left ? "M0 0.5 L60 45.5" : "M60 0.5 L0 45.5"}
              stroke={ink}
              strokeOpacity={lineOpacity}
              initial={false}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={{
                duration: on ? 0.6 : 0.2,
                delay: on ? 1.15 + wait : 0,
                ease: "easeOut",
              }}
            />
          </svg>
        </div>
        {callout.detail && (
          <motion.p
            className={`mt-2 max-w-[13rem] text-[13px] leading-snug ${dark ? "text-white/55" : "text-[#16122B]/55"}`}
            initial={false}
            animate={{ opacity: on ? 1 : 0 }}
            transition={{ duration: 0.5, delay: on ? 0.9 + wait : 0 }}
          >
            {callout.detail}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
