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
  { label: "INSTANT SPLIT", info: "EQUAL, SHARES OR EXACT. SETTLED IN ONE TAP" },
  { label: "RECEIPT VISION", info: "OCR SCANS ITEMIZE EVERY BILL AUTOMATICALLY" },
  { label: "SETTLE CHAT", info: "EVERY PAYMENT LIVES INSIDE THE CONVERSATION" },
  { label: "DEBT GRAPH", info: "BALANCES ROUTED THROUGH MINIMAL TRANSFERS" },
  { label: "LIVE LEDGER", info: "REAL-TIME SYNC ACROSS EVERY DEVICE" },
  { label: "UPI BRIDGE", info: "CLEAR ALL DEBTS IN SECONDS, NO REMINDERS" },
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

  // Keep rotating even while hovered, just a touch slower so the chip stays readable.
  useEffect(() => {
    if (!inView) return;
    const delay = hovered !== null ? 1000 : STEP_MS;
    const id = setInterval(() => setActive((i) => i + 1), delay);
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
      className="relative flex sm:min-h-[100dvh] flex-col overflow-hidden bg-[#030303] text-white"
    >
      {/* Ambient glow, same language as the rest of the landing page */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-7 sm:py-12">
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
            <p className="rounded-lg border border-cyan-400/40 bg-black/80 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/85">
              &middot; {wordAt(active).info}
            </p>
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
