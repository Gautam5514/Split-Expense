// Line icons for generated documents, drawn as crisp vectors (no emoji, no
// image files). Path data from Lucide (https://lucide.dev, ISC licence), on a
// 24x24 grid with round caps - the same icon style the apps use.

const P = (d) => ({ t: "path", d });
const C = (cx, cy, r) => ({ t: "circle", cx, cy, r });
const R = (x, y, w, h, rx) => ({ t: "rect", x, y, w, h, rx });

export const ICONS = {
  check: [P("M20 6L9 17L4 12")],
  clock: [C(12, 12, 10), P("M12 6L12 12L16 14")],
  arrowRight: [P("M5 12L19 12"), P("M12 5L19 12L12 19")],
  wallet: [
    P("M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"),
    P("M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"),
  ],
  users: [
    P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"), C(9, 7, 4),
    P("M22 21v-2a4 4 0 0 0-3-3.87"), P("M16 3.13a4 4 0 0 1 0 7.75"),
  ],
  receipt: [
    P("M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"),
    P("M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"), P("M12 17.5v-11"),
  ],
  calendar: [R(3, 4, 18, 18, 2), P("M16 2v4"), P("M8 2v4"), P("M3 10h18")],
  trendingUp: [P("M22 7L13.5 15.5L8.5 10.5L2 17"), P("M16 7h6v6")],
  pieChart: [P("M21.21 15.89A10 10 0 1 1 8 2.83"), P("M22 12A10 10 0 0 0 12 2v10z")],
  award: [C(12, 8, 6), P("M15.477 12.89L17 22l-5-3-5 3 1.523-9.11")],
  swap: [P("M8 3L4 7l4 4"), P("M4 7h16"), P("M16 21l4-4-4-4"), P("M20 17H4")],
  info: [C(12, 12, 10), P("M12 16v-4"), P("M12 8h.01")],
  barChart: [P("M3 3v18h18"), P("M18 17V9"), P("M13 17V5"), P("M8 17v-3")],
  fileText: [
    P("M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"), P("M14 2v4a2 2 0 0 0 2 2h4"),
    P("M10 9H8"), P("M16 13H8"), P("M16 17H8"),
  ],
  user: [P("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"), C(12, 7, 4)],
  message: [P("M7.9 20A9 9 0 1 0 4 16.1L2 22Z")],
  sparkles: [
    P("M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"),
  ],
};

/** Draw icon `name` with its top-left at (x, y), `size` points wide. */
export function drawIcon(doc, name, x, y, size, color, { weight = 2 } = {}) {
  const parts = ICONS[name];
  if (!parts) return;
  doc.save();
  doc.translate(x, y).scale(size / 24);
  doc.lineWidth(weight).lineCap("round").lineJoin("round").strokeColor(color);
  for (const p of parts) {
    if (p.t === "path") doc.path(p.d).stroke();
    else if (p.t === "circle") doc.circle(p.cx, p.cy, p.r).stroke();
    else doc.roundedRect(p.x, p.y, p.w, p.h, p.rx).stroke();
  }
  doc.restore();
}

/** Icon centred in a filled circle (the "icon badge" used on cards). */
export function drawIconBadge(doc, name, cx, cy, diameter, { bg, fg, ratio = 0.5 } = {}) {
  doc.circle(cx, cy, diameter / 2).fill(bg);
  const s = diameter * ratio;
  drawIcon(doc, name, cx - s / 2, cy - s / 2, s, fg);
}
