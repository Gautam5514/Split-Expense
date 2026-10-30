"use client";

import { useEffect, useRef } from "react";
import styles from "./ParticleWordmark.module.css";

export default function ParticleWordmark() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let particles = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let spacing = 6;
    let previous = 0;
    let visible = false;
    let disposed = false;
    const pointer = { x: -1000, y: -1000, active: false };

    const render = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const energy = Math.min(1, Math.hypot(particle.x - particle.homeX, particle.y - particle.homeY) / 30);
        // Stay in SplitEase's existing slate-to-cyan palette.
        context.fillStyle = `rgb(${Math.round(113 - 79 * energy)},${Math.round(130 + 81 * energy)},${Math.round(139 + 99 * energy)})`;
        context.beginPath();
        context.arc(particle.x, particle.y, spacing * (.34 + energy * .045), 0, Math.PI * 2);
        context.fill();
      }
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
    const reset = () => {
      for (const p of particles) { p.x = p.homeX; p.y = p.homeY; p.vx = 0; p.vy = 0; }
    };
    const tick = (now) => {
      frame = 0;
      if (disposed || !visible || document.hidden || motion.matches) return;
      const dt = previous ? Math.min((now - previous) / 16.667, 2) : 1;
      previous = now;
      const radius = Math.max(28, Math.min(60, width * .048));
      let unsettled = false;
      for (const p of particles) {
        let targetX = p.homeX;
        let targetY = p.homeY;
        if (pointer.active) {
          const dx = p.homeX - pointer.x;
          const dy = p.homeY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < radius) {
            const force = Math.pow(1 - distance / radius, 2) * radius * .52;
            // A deterministic direction for the rare exact center hit.
            targetX += distance > .01 ? dx / distance * force : force;
            targetY += distance > .01 ? dy / distance * force : 0;
          }
        }
        p.vx = (p.vx + (targetX - p.x) * .065 * dt) * Math.pow(.73, dt);
        p.vy = (p.vy + (targetY - p.y) * .065 * dt) * Math.pow(.73, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (Math.abs(targetX - p.x) + Math.abs(targetY - p.y) + Math.abs(p.vx) + Math.abs(p.vy) > .08) unsettled = true;
        else { p.x = targetX; p.y = targetY; p.vx = 0; p.vy = 0; }
      }
      render();
      if (unsettled) frame = requestAnimationFrame(tick);
      else previous = 0;
    };
    const wake = () => {
      if (!disposed && visible && !document.hidden && !motion.matches && !frame) frame = requestAnimationFrame(tick);
    };
    const build = () => {
      if (disposed) return;
      const nextWidth = Math.round(canvas.clientWidth);
      const nextHeight = Math.round(canvas.clientHeight);
      if (!nextWidth || !nextHeight) return;
      stop();
      width = nextWidth;
      height = nextHeight;
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      // Text is sampled once on resize, never inside the animation loop.
      const mask = document.createElement("canvas");
      mask.width = width;
      mask.height = height;
      const ink = mask.getContext("2d", { willReadFrequently: true });
      if (!ink) return;
      const font = getComputedStyle(canvas).fontFamily;
      ink.font = `800 100px ${font}`;
      const textWidth = ink.measureText("splitease").width;
      const fontSize = Math.min((width - 26) / textWidth * 100, height * .94);
      ink.font = `800 ${fontSize}px ${font}`;
      ink.textAlign = "center";
      const metrics = ink.measureText("splitease");
      const ascent = metrics.actualBoundingBoxAscent;
      const descent = metrics.actualBoundingBoxDescent;
      ink.fillText("splitease", width / 2, (height + ascent - descent) / 2);
      const pixels = ink.getImageData(0, 0, width, height).data;
      // Bounds the particle count on large screens; mobile remains readable.
      spacing = Math.max(3, width / 205);
      particles = [];
      for (let y = spacing; y < height - spacing; y += spacing) {
        for (let x = spacing; x < width - spacing; x += spacing) {
          if (pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 120) {
            particles.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0 });
          }
        }
      }
      render();
    };
    const move = (event) => {
      if (!finePointer.matches || motion.matches || event.pointerType === "touch") return;
      pointer.x = event.offsetX;
      pointer.y = event.offsetY;
      pointer.active = true;
      wake();
    };
    const leave = () => { pointer.active = false; wake(); };
    const preference = () => { pointer.active = false; stop(); reset(); render(); };
    const visibility = () => {
      if (document.hidden) { pointer.active = false; stop(); }
      else { reset(); render(); }
    };
    const resize = new ResizeObserver(build);
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { pointer.active = false; stop(); }
      else { reset(); render(); }
    });
    observer.observe(canvas);
    canvas.addEventListener("pointermove", move, { passive: true });
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointercancel", leave);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", preference);
    finePointer.addEventListener("change", preference);
    build();
    document.fonts.ready.then(() => { if (!disposed) build(); });
    return () => {
      disposed = true;
      stop();
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", preference);
      finePointer.removeEventListener("change", preference);
    };
  }, []);

  return <div className={styles.wordmark} role="img" aria-label="SplitEase">
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true">splitease</canvas>
  </div>;
}
