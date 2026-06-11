"use client";

import { useEffect, useRef } from "react";

/**
 * Custom wireframe dotted 3D globe — ZERO dependencies.
 * Pure Canvas2D: latitude rings + longitude meridians as dots,
 * front hemisphere bright, back hemisphere faint, slight axial tilt.
 * Guaranteed visible (no WebGL, no external library to fail).
 * Rotation = slow idle drift + scroll-linked spin (reverses on scroll up).
 */
export default function Globe({ scrollProgress }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let phi = 0;
    let visible = true;
    let W = 0;
    let R = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const TILT = 0.32; // axial tilt for the 3D look
    const sinT = Math.sin(TILT);
    const cosT = Math.cos(TILT);

    /* ---- precompute sphere points (lat rings + meridians) ---- */
    const pts = [];
    const D2R = Math.PI / 180;
    const push = (latDeg, lonDeg) => {
      const la = latDeg * D2R;
      const lo = lonDeg * D2R;
      const x = Math.cos(la) * Math.cos(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.sin(lo);
      // apply axial tilt (rotate around X)
      const y2 = y * cosT - z * sinT;
      const z2 = y * sinT + z * cosT;
      pts.push({ x, y: y2, z: z2 });
    };
    for (let lat = -75; lat <= 75; lat += 15)
      for (let lon = 0; lon < 360; lon += 5) push(lat, lon);
    for (let lon = 0; lon < 360; lon += 15)
      for (let lat = -88; lat <= 88; lat += 5) push(lat, lon);

    /* ---- sizing ---- */
    const size = () => {
      const s = Math.min(window.innerHeight * 1.05, 900);
      W = s;
      canvas.width = s * dpr;
      canvas.height = s * dpr;
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = s * 0.42;
    };
    size();

    /* ---- render loop ---- */
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      phi += 0.0015; // idle drift
      const rot = phi + scrollProgress.get() * 3.0; // scroll-linked spin
      const sin = Math.sin(rot);
      const cos = Math.cos(rot);
      const c = W / 2;

      ctx.clearRect(0, 0, W, W);

      // outer ring
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // dots
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        const front = z > 0;
        const a = front ? 0.16 + 0.5 * z : 0.05; // front bright, back faint
        ctx.fillStyle = `rgba(215,222,235,${a})`;
        const r = front ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(c + x * R, c + p.y * R, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    /* ---- resize + visibility ---- */
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(size, 150);
    };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (wrapRef.current) io.observe(wrapRef.current);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      io.disconnect();
    };
  }, [scrollProgress]);

  return (
    <div ref={wrapRef}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
