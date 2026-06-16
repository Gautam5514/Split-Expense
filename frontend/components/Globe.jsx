"use client";

import { useEffect, useRef } from "react";

/**
 * Dotted WORLD-MAP globe — ZERO dependencies, pure Canvas2D.
 *
 * Instead of plain lat/long rings, dots are placed only where there is LAND
 * (continents are described as coarse lon/lat polygons and sampled on a grid),
 * giving a recognisable dark-theme world map wrapped on a slowly spinning
 * sphere. Key countries are MARKED with glowing cyan beacons + pulsing rings,
 * and thin great-circle arcs connect them into a "network" — front hemisphere
 * bright, back hemisphere faint. Rotation = idle drift + scroll-linked spin.
 */

const D2R = Math.PI / 180;

/* ---- coarse continent outlines as [lon, lat] polygons ---- */
/* Rough on purpose: enough vertices to read as the real landmasses.        */
const LAND = [
  // North America (Canada + USA + Mexico)
  [[-168,66],[-162,70],[-140,70],[-122,71],[-100,73],[-83,73],[-74,68],[-60,66],[-54,60],[-52,52],[-64,46],[-70,42],[-75,37],[-81,30],[-81,25],[-90,29],[-97,26],[-97,20],[-105,22],[-110,24],[-114,30],[-120,34],[-124,40],[-124,48],[-130,55],[-140,60],[-150,60],[-162,58],[-166,61],[-168,66]],
  // Central America bridge
  [[-92,16],[-86,13],[-83,9],[-77,8],[-80,12],[-86,17],[-92,18],[-92,16]],
  // South America
  [[-78,9],[-72,11],[-60,10],[-52,5],[-50,0],[-44,-2],[-38,-5],[-35,-8],[-39,-16],[-48,-25],[-58,-35],[-66,-45],[-72,-52],[-74,-50],[-72,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,2],[-78,9]],
  // Eurasia (Europe + Asia incl. India peninsula, Arabia, SE Asia)
  [[-10,36],[-9,44],[-4,48],[3,51],[8,54],[5,58],[10,63],[16,68],[25,71],[35,71],[50,70],[68,73],[90,75],[110,77],[130,73],[145,72],[162,70],[172,67],[178,67],[170,60],[155,57],[143,50],[140,45],[127,40],[122,32],[120,25],[110,21],[108,15],[105,9],[100,6],[100,13],[98,16],[94,16],[90,22],[88,21],[80,8],[77,8],[73,18],[68,23],[62,25],[57,25],[50,28],[48,30],[44,38],[36,36],[28,36],[26,40],[18,40],[10,44],[2,40],[-6,36],[-10,36]],
  // Africa
  [[-17,15],[-16,20],[-10,28],[0,33],[10,37],[20,33],[25,32],[32,31],[35,28],[38,18],[43,12],[51,12],[48,5],[42,-2],[40,-10],[35,-20],[30,-30],[20,-35],[18,-30],[15,-20],[12,-8],[8,4],[0,5],[-8,5],[-12,8],[-17,15]],
  // Australia
  [[113,-22],[122,-18],[130,-12],[137,-12],[142,-11],[145,-17],[150,-25],[153,-30],[150,-38],[143,-39],[135,-35],[125,-34],[118,-35],[114,-30],[113,-22]],
  // Greenland
  [[-45,60],[-30,60],[-20,70],[-22,80],[-40,83],[-55,80],[-50,70],[-45,60]],
  // British Isles
  [[-6,50],[-3,54],[-5,58],[-9,56],[-7,51],[-6,50]],
  // Japan
  [[130,31],[136,35],[141,40],[143,43],[140,38],[135,33],[131,32],[130,31]],
  // Indonesia / SE Asia islands
  [[95,5],[105,-1],[118,-3],[131,-3],[141,-3],[133,-6],[120,-9],[108,-8],[100,-2],[95,5]],
  // Madagascar
  [[44,-16],[47,-19],[50,-23],[47,-25],[44,-22],[43,-18],[44,-16]],
  // New Zealand
  [[167,-44],[170,-46],[174,-41],[177,-38],[173,-41],[170,-43],[167,-44]],
];

/* ---- countries to mark + the network of arcs between them ---- */
const CITIES = [
  { name: "USA",       lon: -74.0, lat: 40.7 },
  { name: "BRAZIL",    lon: -46.6, lat: -23.5 },
  { name: "UK",        lon: -0.12, lat: 51.5 },
  { name: "PARIS",     lon: 2.35,  lat: 48.85 },
  { name: "RUSSIA",    lon: 37.6,  lat: 55.75 },
  { name: "UAE",       lon: 55.3,  lat: 25.2 },
  { name: "INDIA",     lon: 77.2,  lat: 28.6 },
  { name: "SINGAPORE", lon: 103.8, lat: 1.35 },
  { name: "JAPAN",     lon: 139.7, lat: 35.7 },
  { name: "S.AFRICA",  lon: 28.0,  lat: -26.2 },
  { name: "AUSTRALIA", lon: 151.2, lat: -33.86 },
];
const idx = (n) => CITIES.findIndex((c) => c.name === n);
const ARCS = [
  ["INDIA", "USA"], ["INDIA", "PARIS"], ["INDIA", "JAPAN"],
  ["INDIA", "AUSTRALIA"], ["INDIA", "UAE"], ["USA", "UK"],
  ["USA", "BRAZIL"], ["PARIS", "RUSSIA"], ["JAPAN", "SINGAPORE"],
  ["UAE", "S.AFRICA"],
].map(([a, b]) => [idx(a), idx(b)]);

/* point-in-polygon (ray casting) */
function inPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const isLand = (lon, lat) => LAND.some((p) => inPoly(lon, lat, p));

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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap fill area
    const TILT = 0.32; // axial tilt for the 3D look
    const sinT = Math.sin(TILT);
    const cosT = Math.cos(TILT);

    // lon/lat -> tilted unit vector (shared by land dots, markers and arcs)
    const toVec = (lonDeg, latDeg) => {
      const la = latDeg * D2R, lo = lonDeg * D2R;
      const x = Math.cos(la) * Math.cos(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.sin(lo);
      return { x, y: y * cosT - z * sinT, z: y * sinT + z * cosT };
    };

    /* ---- precompute LAND dots (flat typed arrays = cache-friendly) ---- */
    const lx = [], ly = [], lz = [];
    for (let lat = -84; lat <= 84; lat += 3)
      for (let lon = -180; lon < 180; lon += 3)
        if (isLand(lon, lat)) {
          const v = toVec(lon, lat);
          lx.push(v.x); ly.push(v.y); lz.push(v.z);
        }
    const LAND_X = new Float32Array(lx);
    const LAND_Y = new Float32Array(ly);
    const LAND_Z = new Float32Array(lz);
    const LAND_N = LAND_X.length;

    /* ---- precompute marker vectors ---- */
    const markers = CITIES.map((c) => ({ ...c, v: toVec(c.lon, c.lat) }));

    /* ---- precompute great-circle arc points (slerp, then sample) ---- */
    const SEG = 36;
    const arcs = ARCS.map(([a, b]) => {
      const A = CITIES[a], B = CITIES[b];
      // untilted unit vectors for clean slerp
      const u = (c) => {
        const la = c.lat * D2R, lo = c.lon * D2R;
        return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
      };
      const v0 = u(A), v1 = u(B);
      const dot = Math.max(-1, Math.min(1, v0[0]*v1[0] + v0[1]*v1[1] + v0[2]*v1[2]));
      const th = Math.acos(dot) || 1e-4;
      const s = Math.sin(th);
      const pts = [];
      for (let k = 0; k <= SEG; k++) {
        const t = k / SEG;
        const w0 = Math.sin((1 - t) * th) / s;
        const w1 = Math.sin(t * th) / s;
        // lift the arc slightly off the surface so it reads as a hop
        const lift = 1 + 0.14 * Math.sin(Math.PI * t);
        let x = (w0 * v0[0] + w1 * v1[0]) * lift;
        let y = (w0 * v0[1] + w1 * v1[1]) * lift;
        let z = (w0 * v0[2] + w1 * v1[2]) * lift;
        pts.push({ x, y: y * cosT - z * sinT, z: y * sinT + z * cosT });
      }
      return pts;
    });

    /* ---- sizing (gradient is cached here, NOT rebuilt every frame) ---- */
    let atmo = null;
    const size = () => {
      const s = Math.min(window.innerHeight * 1.05, 900);
      W = s;
      canvas.width = s * dpr;
      canvas.height = s * dpr;
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = s * 0.42;
      const c = W / 2;
      atmo = ctx.createRadialGradient(c, c, R * 0.15, c, c, R * 1.1);
      atmo.addColorStop(0, "rgba(34,211,238,0.10)");
      atmo.addColorStop(0.55, "rgba(34,211,238,0.035)");
      atmo.addColorStop(1, "rgba(0,0,0,0)");
    };
    size();

    /* ---- render loop — ADAPTIVE: 30fps while scrolling, 20fps when idle ---- */
    const TAU = Math.PI * 2;
    const DT_ACTIVE = 1000 / 30; // smooth during scroll
    const DT_IDLE = 1000 / 20;   // calmer when the user has stopped
    let last = -1e9;
    let lastScroll = -1;

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      const sp = scrollProgress.get();
      const scrolling = sp !== lastScroll;
      lastScroll = sp;
      if (ts - last < (scrolling ? DT_ACTIVE : DT_IDLE)) return;
      last = ts;

      phi += 0.003; // idle drift (×2 since we run at ~half the framerate)
      const rot = phi + sp * 3.0; // scroll-linked spin
      const sin = Math.sin(rot);
      const cos = Math.cos(rot);
      const c = W / 2;
      const now = ts / 1000;

      ctx.clearRect(0, 0, W, W);

      // atmosphere (cached gradient) + outer rim
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(c, c, R * 1.1, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c, c, R, 0, TAU);
      ctx.strokeStyle = "rgba(120,220,240,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // LAND dots — bucketed into 4 Path2D and filled in 4 calls (not 1000s).
      // Depth is approximated by tier instead of a per-dot alpha.
      const back = new Path2D(), t0 = new Path2D(), t1 = new Path2D(), t2 = new Path2D();
      for (let i = 0; i < LAND_N; i++) {
        const px = LAND_X[i], pz = LAND_Z[i];
        const Z = -px * sin + pz * cos;
        const sx = c + (px * cos + pz * sin) * R;
        const sy = c + LAND_Y[i] * R;
        if (Z <= 0) { back.rect(sx - 0.5, sy - 0.5, 1, 1); continue; }
        const tier = Z > 0.66 ? t2 : Z > 0.33 ? t1 : t0;
        tier.rect(sx - 0.8, sy - 0.8, 1.6, 1.6);
      }
      ctx.fillStyle = "rgba(176,198,230,0.09)"; ctx.fill(back);
      ctx.fillStyle = "rgba(176,198,230,0.38)"; ctx.fill(t0);
      ctx.fillStyle = "rgba(184,205,236,0.62)"; ctx.fill(t1);
      ctx.fillStyle = "rgba(198,216,244,0.92)"; ctx.fill(t2);

      // CONNECTION arcs — additive glow via blending only (NO shadowBlur).
      // One Path2D per arc, stroked twice (wide soft + thin bright core).
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let a = 0; a < arcs.length; a++) {
        const pts = arcs[a];
        const path = new Path2D();
        let drawing = false;
        for (let k = 0; k < pts.length; k++) {
          const p = pts[k];
          const Z = -p.x * sin + p.z * cos;
          if (Z > 0) {
            const sx = c + (p.x * cos + p.z * sin) * R, sy = c + p.y * R;
            if (drawing) path.lineTo(sx, sy);
            else { path.moveTo(sx, sy); drawing = true; }
          } else drawing = false;
        }
        ctx.strokeStyle = "rgba(34,211,238,0.20)"; ctx.lineWidth = 3.2; ctx.stroke(path);
        ctx.strokeStyle = "rgba(125,236,255,0.70)"; ctx.lineWidth = 1.3; ctx.stroke(path);

        // travelling comet head (two cheap concentric discs, no shadow)
        const pk = Math.round(((now * 0.35 + a * 0.27) % 1) * SEG);
        const pp = pts[pk];
        const Zp = -pp.x * sin + pp.z * cos;
        if (Zp > 0) {
          const sx = c + (pp.x * cos + pp.z * sin) * R, sy = c + pp.y * R;
          ctx.fillStyle = "rgba(70,210,240,0.35)";
          ctx.beginPath(); ctx.arc(sx, sy, 4, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(190,248,255,0.9)";
          ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, TAU); ctx.fill();
        }
      }

      // COUNTRY markers — single pulse ring + concentric glow (no shadowBlur)
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i];
        const Z = -m.v.x * sin + m.v.z * cos;
        if (Z <= 0.04) continue;
        const sx = c + (m.v.x * cos + m.v.z * sin) * R, sy = c + m.v.y * R;
        const f = Z < 1 ? Z : 1;

        const ph = (now * 0.7 + i * 0.31) % 1;
        ctx.strokeStyle = `rgba(56,221,245,${(1 - ph) * 0.5 * f})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(sx, sy, 3 + ph * 13, 0, TAU); ctx.stroke();

        ctx.fillStyle = `rgba(34,211,238,${0.18 * f})`;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(120,235,255,${0.6 * f})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.95 * f})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, TAU); ctx.fill();
      }
      ctx.restore();

      // labels (normal blending, only when comfortably on the front)
      ctx.textBaseline = "middle";
      ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i];
        const Z = -m.v.x * sin + m.v.z * cos;
        if (Z <= 0.45) continue;
        const sx = c + (m.v.x * cos + m.v.z * sin) * R, sy = c + m.v.y * R;
        ctx.fillStyle = `rgba(232,244,255,${(Z - 0.45) * 1.6})`;
        ctx.fillText(m.name, sx + 7, sy - 0.5);
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
