"use client";

import { useEffect, useRef, useState } from "react";
import { Saira_Condensed, VT323 } from "next/font/google";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

/* Axiom-style rotating words: the centered word auto-advances every 900ms,
   gets square bracket corners, and hovering any word shows a cursor-following
   info chip. The list scrolls one way forever (content repeats), never jumps
   back to the top. Whole section fits one viewport. */

const condensed = Saira_Condensed({ weight: "600", subsets: ["latin"] });
const pixel = VT323({ weight: "400", subsets: ["latin"] });

const STEP_MS = 900;
const ROW = "clamp(44px, 6.5vw, 92px)";

const WORDS = [
  { label: "INSTANT SPLIT", info: "EQUAL, SHARES OR EXACT. SETTLED IN ONE TAP", image: "/intelligence/instant-split.jpg" },
  { label: "RECEIPT VISION", info: "ATTACH BILL PHOTOS NOW - AI ITEMIZATION COMING SOON", image: "/intelligence/receipt-vision.jpg" },
  { label: "SETTLE CHAT", info: "EVERY PAYMENT LIVES INSIDE THE CONVERSATION", image: "/intelligence/settle-chat.jpg" },
  { label: "DEBT GRAPH", info: "BALANCES ROUTED THROUGH MINIMAL TRANSFERS", image: "/intelligence/debt-graph.jpg" },
  { label: "LIVE LEDGER", info: "REAL-TIME SYNC ACROSS EVERY DEVICE", image: "/intelligence/live-ledger.jpg" },
  { label: "SETTLE CONFIRM", info: "TWO-PARTY CONFIRMATION BEFORE ANY BALANCE MOVES", image: "/intelligence/settle-confirm.jpg" },
];

// Active index grows forever; content repeats so the scroll never jumps back up.
const wordAt = (i) => WORDS[((i % WORDS.length) + WORDS.length) % WORDS.length];

function Corners() {
  const side = "absolute h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border-cyan-400/90";
  return (
    <motion.span
      layoutId="word-brackets"
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="pointer-events-none absolute -inset-x-3 inset-y-1 sm:-inset-x-5"
    >
      <span className={`${side} left-0 top-0 border-l border-t`} />
      <span className={`${side} right-0 top-0 border-r border-t`} />
      <span className={`${side} bottom-0 left-0 border-b border-l`} />
      <span className={`${side} bottom-0 right-0 border-b border-r`} />
    </motion.span>
  );
}

export default function IntelligenceSection() {
  const sectionRef = useRef(null);
  const rowRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const reducedMotion = useReducedMotion();

  // Start on the second word so the initial y of 0 already centers it.
  const [active, setActive] = useState(1);
  const [hovered, setHovered] = useState(null);
  const [rowH, setRowH] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const chipX = useSpring(mouseX, { stiffness: 380, damping: 34, mass: 0.5 });
  const chipY = useSpring(mouseY, { stiffness: 380, damping: 34, mass: 0.5 });

  useEffect(() => {
    const measure = () => rowRef.current && setRowH(rowRef.current.offsetHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Hold a hovered feature for four seconds, then resume the automatic sequence.
  useEffect(() => {
    if (!inView) return;

    if (hovered !== null) {
      const hold = setTimeout(() => {
        setHovered(null);
        setActive((i) => i + 1);
      }, 4000);
      return () => clearTimeout(hold);
    }

    const id = setInterval(() => setActive((i) => i + 1), STEP_MS);
    return () => clearInterval(id);
  }, [inView, hovered]);

  // Drop a stale hover once its row has scrolled out from under the cursor.
  useEffect(() => {
    if (hovered !== null && Math.abs(hovered - active) > 2) setHovered(null);
  }, [active, hovered]);

  const focus = hovered ?? active;

  const onMouseMove = (e) => {
    mouseX.set(Math.min(e.clientX, window.innerWidth - 360));
    mouseY.set(Math.min(e.clientY, window.innerHeight - 80));
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[780px] flex-col overflow-hidden bg-[#030303] text-white sm:min-h-[112dvh] lg:min-h-[820px]"
    >
      {/* Ambient glow, same language as the rest of the landing page */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-9 sm:px-8 sm:py-14">
        {/* Header block */}
        <div className="max-w-md font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] sm:text-[11px]">
          <p className="text-cyan-400">Splitease</p>
          <p className="text-white/40">Inside the Splitease engine</p>
          <p className="mt-5 text-white/70">
            A living expense engine. Continuously tracking, auto-balancing, and
            settling debts with contextual awareness. Each node is a distinct
            skill, working in unison.
          </p>
        </div>

        {/* A visual explanation appears on the right without changing the word interaction. */}
        <AnimatePresence mode="wait">
          {hovered !== null && (
            <motion.aside
              key={wordAt(hovered).label}
              initial={{ opacity: 0, x: -220, scaleX: 0.025, scaleY: 1, rotateY: -86, filter: "blur(5px)" }}
              animate={{
                opacity: [0, 1, 1],
                x: [-220, -90, 0],
                scaleX: [0.025, 0.035, 1],
                scaleY: 1,
                rotateY: [-86, -78, 0],
                filter: ["blur(5px)", "blur(2px)", "blur(0px)"],
              }}
              exit={{
                opacity: [1, 1, 0],
                x: [0, -90, -190],
                scaleX: [1, 0.035, 0.02],
                scaleY: 1,
                rotateY: [0, -78, -88],
                filter: ["blur(0px)", "blur(2px)", "blur(5px)"],
              }}
              transition={{ duration: 0.78, times: [0, 0.28, 1], ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute right-6 top-1/2 z-30 hidden h-[clamp(460px,56dvh,540px)] w-[26%] max-w-[380px] -translate-y-1/2 lg:block xl:right-10"
              style={{ transformOrigin: "left center", perspective: 1200 }}
            >
              <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-1 shadow-[0_35px_100px_rgba(0,0,0,0.72),0_0_45px_rgba(34,211,238,0.1),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-cyan-400/[0.035]" />
                <img
                  src={wordAt(hovered).image}
                  alt={`${wordAt(hovered).label.toLowerCase()} feature preview`}
                  className="relative h-full w-full rounded-[1.5rem] object-cover opacity-95"
                />
                <div className="absolute inset-1 rounded-[1.5rem] border border-white/[0.06] bg-gradient-to-t from-black via-black/10 to-white/[0.025]" />
                <div className="absolute inset-x-6 bottom-6">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
                    Visual preview
                  </div>
                  <p className={`${condensed.className} text-2xl uppercase leading-none tracking-wide text-white`}>
                    {wordAt(hovered).label}
                  </p>
                </div>
              </div>
              <motion.span
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
                className="absolute -left-20 top-1/2 h-px w-20 origin-left bg-gradient-to-r from-transparent via-cyan-300/30 to-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Rotating word stack, vertically centered in the leftover space */}
        <div className="my-8 py-2 sm:my-auto sm:py-6">
          <p className="mb-4 hidden text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 md:block">
            Hover on words
          </p>

          <div
            className="relative mx-auto overflow-hidden"
            style={{
              height: `calc(3 * ${ROW})`,
              maskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 78%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 78%, transparent 100%)",
            }}
          >
            {/* Invisible sizer that defines one row height */}
            <div ref={rowRef} aria-hidden className="invisible" style={{ height: ROW }} />

            <motion.div
              className="absolute inset-x-0 top-0"
              animate={{ y: (1 - active) * rowH }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 30 }}
            >
              {rowH > 0 &&
                Array.from({ length: 8 }, (_, k) => active - 3 + k).map((idx) => {
                  const word = wordAt(idx);
                  const isFocus = idx === focus;
                  return (
                    <div
                      key={idx}
                      className="absolute inset-x-0 flex items-center justify-center"
                      style={{ top: idx * rowH, height: ROW }}
                    >
                      <span
                        onMouseEnter={() => setHovered(idx)}
                        onMouseLeave={() => setHovered(null)}
                        className="clickable relative cursor-pointer select-none px-4 sm:px-8"
                      >
                        {isFocus && <Corners />}
                        <span
                          className={`${condensed.className} text-[clamp(34px,5vw,72px)] uppercase leading-none tracking-[0.01em]`}
                          style={
                            isFocus
                              ? { color: "#F5F7FA" }
                              : {
                                  backgroundImage:
                                    "linear-gradient(180deg, rgba(245,247,250,0.6), rgba(245,247,250,0.06))",
                                  WebkitBackgroundClip: "text",
                                  backgroundClip: "text",
                                  color: "transparent",
                                }
                          }
                        >
                          {word.label}
                        </span>
                      </span>
                    </div>
                  );
                })}
            </motion.div>
          </div>

          {/* Touch devices get the info inline instead of a cursor chip */}
          <div className="mt-5 flex justify-center md:hidden">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <img src={wordAt(active).image} alt="" className="aspect-[16/8] w-full rounded-xl object-cover" />
              <p className="px-2 pb-2 pt-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/85">
                &middot; {wordAt(active).info}
              </p>
            </div>
          </div>
        </div>

        {/* Intelligence / Model footer line */}
        <div className="flex items-end gap-4 sm:gap-7">
          <span className={`${pixel.className} leading-none text-[clamp(40px,6.6vw,92px)]`}>
            Intelligence
          </span>
          <span className="mb-[0.18em] h-px flex-1 bg-white/30" />
          <span className="font-serif-premium italic leading-none text-[clamp(40px,6.6vw,92px)]">
            Model
          </span>
        </div>
      </div>

      {/* Cursor-following info chip */}
      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed left-0 top-0 z-[60] hidden md:block"
            style={{ x: chipX, y: chipY }}
          >
            <p className="ml-5 mt-6 whitespace-nowrap rounded-lg border border-cyan-400/50 bg-black/90 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(34,211,238,0.15)]">
              &middot; {wordAt(hovered).info}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
