"use client";

/* Synthesized premium coin chimes via Web Audio - no audio assets, no
   loading. Browsers only allow sound after a user gesture; every call is
   safe to make anytime and silently no-ops when audio isn't allowed yet. */

let audioCtx = null;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
};

const tone = (ctx, { freq, at, dur, type = "sine", gain = 0.1 }) => {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

/* Coins arriving: the classic bright two-note coin chime (B5 -> E6) with a
   sparkle overtone. Short, joyful, instantly recognizable. */
export const playCoinEarn = () => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    tone(ctx, { freq: 987.77, at: 0, dur: 0.085, type: "square", gain: 0.045 });
    tone(ctx, { freq: 987.77, at: 0, dur: 0.085, type: "sine", gain: 0.1 });
    tone(ctx, { freq: 1318.51, at: 0.082, dur: 0.42, type: "square", gain: 0.04 });
    tone(ctx, { freq: 1318.51, at: 0.082, dur: 0.42, type: "sine", gain: 0.12 });
    tone(ctx, { freq: 2637.02, at: 0.1, dur: 0.28, type: "sine", gain: 0.035 });
  } catch {
    // never let sound break the UI
  }
};

/* Coins spent: a soft rising "cha-ching" - low thunk into a bright shimmer.
   Feels like a successful card tap rather than losing money. */
export const playCoinSpend = () => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    tone(ctx, { freq: 392.0, at: 0, dur: 0.09, type: "triangle", gain: 0.12 });
    tone(ctx, { freq: 523.25, at: 0.075, dur: 0.1, type: "triangle", gain: 0.12 });
    tone(ctx, { freq: 1046.5, at: 0.16, dur: 0.34, type: "sine", gain: 0.1 });
    tone(ctx, { freq: 1567.98, at: 0.2, dur: 0.3, type: "sine", gain: 0.05 });
  } catch {
    // never let sound break the UI
  }
};
