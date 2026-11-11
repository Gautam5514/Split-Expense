import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { drawIcon, drawIconBadge } from "./brandIcons.js";
import { buildSettlement, to2 } from "../controllers/balanceController.js";

// Pure data + PDF rendering for the "group settled" statement. No DB access
// here - groupReportService loads the documents and passes them in, so this
// file can be unit-tested with plain objects.

const sid = (v) => String(v?._id || v || "");

const isSettlementExpense = (e) =>
  !!e.isSettlement || String(e.description || "").toLowerCase().startsWith("settlement");

// Who actually paid an expense: `payers` when present (multi-payer), else paidBy.
const payersOf = (e) =>
  Array.isArray(e.payers) && e.payers.length
    ? e.payers.map((p) => ({ userId: sid(p.userId), amount: Number(p.amount || 0) }))
    : [{ userId: sid(e.paidBy), amount: Number(e.amount || 0) }];

/**
 * @param {object} p
 * @param {object} p.group      lean group (name, groupType, settings.currency, trip, createdAt, isCompleted)
 * @param {Array}  p.members    [{_id, name, email}] current members
 * @param {Array}  p.expenses   lean expenses of the group (settlements included)
 * @param {string} [p.completedByName]
 * @param {Date}   [p.completedAt]
 */
export function buildReportData({ group, members, expenses, completedByName = "", completedAt = null }) {
  const nameOf = new Map(members.map((m) => [sid(m), m.name || m.email || "Member"]));
  const label = (id) => nameOf.get(String(id)) || "Former member";
  const active = new Set(members.map(sid));

  const rows = new Map(
    members.map((m) => [
      sid(m),
      {
        userId: sid(m), name: label(sid(m)), email: m.email || "",
        paid: 0, share: 0, settlementsSent: 0, settlementsReceived: 0,
        paidCount: 0, biggestPaid: null,
      },
    ]),
  );

  const spending = [];
  const settlements = [];
  const byCategory = new Map();

  const sorted = [...expenses].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

  for (const e of sorted) {
    const when = e.date || e.createdAt || null;
    if (isSettlementExpense(e)) {
      const from = sid(e.paidBy);
      const to = sid(e.splits?.[0]?.userId);
      const amount = Number(e.amount || 0);
      if (rows.has(from)) rows.get(from).settlementsSent += amount;
      if (rows.has(to)) rows.get(to).settlementsReceived += amount;
      const method = /online/i.test(e.description || "") ? "Online" : "Cash";
      settlements.push({ date: when, from: label(from), to: label(to), amount: to2(amount), method });
      continue;
    }

    const payers = payersOf(e);
    for (const p of payers) {
      const r = rows.get(p.userId);
      if (!r) continue;
      r.paid += p.amount;
      r.paidCount += 1;
      if (!r.biggestPaid || p.amount > r.biggestPaid.amount)
        r.biggestPaid = { description: e.description || "Expense", amount: to2(p.amount) };
    }
    for (const s of e.splits || []) {
      const id = sid(s.userId);
      if (rows.has(id)) rows.get(id).share += Number(s.share || 0);
    }

    const cat = (e.category || "general").toLowerCase();
    byCategory.set(cat, to2((byCategory.get(cat) || 0) + Number(e.amount || 0)));

    spending.push({
      date: when,
      description: e.description || "Expense",
      category: cat,
      amount: to2(e.amount),
      paidBy: payers.map((p) => (payers.length > 1 ? `${label(p.userId)} (${to2(p.amount)})` : label(p.userId))).join(", "),
      paidByIds: payers.map((p) => p.userId),
      splitType: e.splitType || "equal",
      splitAmong: (e.splits || []).map((s) => ({ name: label(sid(s.userId)), share: to2(s.share) })),
      notes: e.notes || "",
    });
  }

  const balances = {};
  const memberRows = [...rows.values()].map((r) => {
    const net = to2(r.paid - r.share);
    const finalBalance = to2(net + r.settlementsSent - r.settlementsReceived);
    balances[r.userId] = finalBalance;
    return {
      ...r,
      paid: to2(r.paid), share: to2(r.share), net,
      settlementsSent: to2(r.settlementsSent), settlementsReceived: to2(r.settlementsReceived),
      finalBalance,
    };
  });

  // Anything still unpaid, as the fewest possible transfers.
  const remaining = buildSettlement(balances).map((t) => ({
    fromId: t.from, toId: t.to, from: label(t.from), to: label(t.to), amount: t.amount,
  }));

  const totalSpent = to2(spending.reduce((s, e) => s + e.amount, 0));
  const dates = spending.map((e) => e.date).filter(Boolean).map((d) => new Date(d));
  const settledAmount = to2(settlements.reduce((s, x) => s + x.amount, 0));
  const outstanding = to2(remaining.reduce((s, t) => s + t.amount, 0));
  const categories = [...byCategory.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  // "Smart" highlights for the statement's insights panel.
  const biggest = spending.reduce((b, e) => (!b || e.amount > b.amount ? e : b), null);
  const top = memberRows.reduce((b, m) => (!b || m.paid > b.paid ? m : b), null);
  const byDay = new Map();
  for (const e of spending) {
    if (!e.date) continue;
    const k = new Date(e.date).toISOString().slice(0, 10);
    const d = byDay.get(k) || { date: new Date(e.date), amount: 0, count: 0 };
    d.amount = to2(d.amount + e.amount); d.count += 1;
    byDay.set(k, d);
  }
  const busiest = [...byDay.values()].reduce((b, d) => (!b || d.amount > b.amount ? d : b), null);
  const insights = {
    biggestExpense: biggest ? { description: biggest.description, amount: biggest.amount, paidBy: biggest.paidBy, date: biggest.date } : null,
    topContributor: top && top.paid > 0 ? { name: top.name, amount: top.paid, pct: totalSpent ? Math.round((top.paid / totalSpent) * 100) : 0 } : null,
    busiestDay: busiest,
    topCategory: categories[0] ? { ...categories[0], pct: totalSpent ? Math.round((categories[0].amount / totalSpent) * 100) : 0 } : null,
    averageExpense: spending.length ? to2(totalSpent / spending.length) : 0,
  };
  const days = dates.length ? Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000) + 1 : 0;

  return {
    group: {
      id: sid(group),
      name: group.name,
      type: group.groupType || "general",
      currency: group.settings?.currency || "INR",
      createdAt: group.createdAt || null,
    },
    completedAt: completedAt || new Date(),
    completedByName,
    period: dates.length
      ? { from: new Date(Math.min(...dates)), to: new Date(Math.max(...dates)) }
      : null,
    totals: {
      totalSpent,
      expenseCount: spending.length,
      memberCount: memberRows.length,
      perHead: memberRows.length ? to2(totalSpent / memberRows.length) : 0,
      settlementCount: settlements.length,
      settledAmount,
      outstanding,
      // Share of all debt (paid back + still open) that has been paid back.
      settledPct: settledAmount + outstanding > 0 ? Math.round((settledAmount / (settledAmount + outstanding)) * 100) : 100,
      days,
    },
    members: memberRows,
    spending,
    settlements,
    remaining,
    categories,
    insights,
    fullySettled: remaining.length === 0,
    activeCount: active.size,
  };
}


// ── formatting ──────────────────────────────────────────────────────────────

// "₹6,300" / "₹52.50" / "$1,200" - symbol, Indian grouping, no ".00" noise.
export const fmtMoney = (n, cur = "INR") => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const whole = Number.isInteger(v);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${cur} ${v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
  }
};

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtShortDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-");

const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

// ── PDF ─────────────────────────────────────────────────────────────────────
// SplitEase look: black/white with the cyan brand colour and the logo's
// violet as a second accent; Inter for text, Josefin Sans for the wordmark.

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const FONT_FILES = {
  R: "fonts/Inter-400.ttf", M: "fonts/Inter-500.ttf", SB: "fonts/Inter-600.ttf", B: "fonts/Inter-700.ttf",
  BRAND: "fonts/JosefinSans-700.ttf", DR: "fonts/NotoSansDevanagari-500.ttf", DB: "fonts/NotoSansDevanagari-700.ttf",
};
let assetCache = null;
const loadAssets = () => {
  if (!assetCache) {
    const fonts = {};
    for (const [k, f] of Object.entries(FONT_FILES)) {
      // Load and test-draw each font once; a missing or broken file falls
      // back to a built-in PDF font instead of breaking every statement.
      try {
        const buf = fs.readFileSync(path.join(ASSETS, f));
        const probe = new PDFDocument({ autoFirstPage: false });
        probe.registerFont("probe", buf);
        probe.font("probe").fontSize(10).widthOfString(k.startsWith("D") ? "अमन Aman" : "Aman ₹1,234");
        fonts[k] = buf;
      } catch (err) {
        console.error(`Statement font ${f} unavailable, using a built-in font:`, err.message);
        fonts[k] = null;
      }
    }
    // Dark logo for the dark cover band, light logo for the white running header.
    let logo = null, logoLight = null;
    try { logo = fs.readFileSync(path.join(ASSETS, "brand/logo-160.png")); } catch { /* optional */ }
    try { logoLight = fs.readFileSync(path.join(ASSETS, "brand/logo-light-160.png")); } catch { /* optional */ }
    assetCache = { fonts, logo, logoLight };
  }
  return assetCache;
};

const K = {
  ink: "#111111", body: "#3F3F46", mute: "#71717A", faint: "#A1A1AA", line: "#E4E4E7", wash: "#F4F4F5", page: "#FAFAFA",
  cyan: "#0891B2", cyanDark: "#0E7490", cyanSoft: "#ECFEFF", cyanLine: "#A5F3FC", cyanBright: "#22D3EE",
  violet: "#7C3AED", violetSoft: "#F5F3FF", violetBright: "#A78BFA",
  green: "#16A34A", greenSoft: "#F0FDF4", greenLine: "#BBF7D0",
  red: "#DC2626", redSoft: "#FEF2F2",
  night: "#0B0F17", night2: "#141B2B",
};
const AVATARS = [["#CFFAFE", "#0E7490"], ["#EDE9FE", "#6D28D9"], ["#E0E7FF", "#4338CA"], ["#CCFBF1", "#0F766E"], ["#FAE8FF", "#A21CAF"], ["#E0F2FE", "#0369A1"]];
const BARS = ["#0891B2", "#7C3AED", "#4F46E5", "#0D9488", "#C026D3", "#0284C7", "#64748B"];

const W = 595.28, H = 841.89, M = 44, CW = W - 2 * M, BOTTOM = H - 64;

const DEVA = /[ऀ-ॿ]/;
// Emoji are dropped; anything the fonts can't draw becomes "?".
const clean = (s) => String(s ?? "")
  .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, "")
  .replace(/[^ -ɏ Ͱ-ϿЀ-ԯऀ-ॿḀ-ỿ -⁯₠-⃏℀-⅏←-⇿]/g, "?")
  .replace(/\s+/g, " ").trim();

const initials = (name) => {
  const s = clean(name);
  if (DEVA.test(s)) return s.slice(0, 1);
  const parts = s.split(" ").filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
};
const avatarColors = (name) => {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
};

/**
 * @param {object} data   buildReportData() output (or its JSON snapshot)
 * @param {object} [o]
 * @param {string} [o.viewerId] member the copy is for - adds their "Your position" card
 * @param {string} [o.refId]    reference shown in the header/footer
 */
export function renderReportPdf(data, { viewerId = null, refId = "" } = {}) {
  return new Promise((resolve, reject) => {
    const { fonts, logo, logoLight } = loadAssets();
    const doc = new PDFDocument({
      size: "A4", margin: 0, bufferPages: true,
      info: { Title: `${clean(data.group.name)} - Settlement statement`, Author: "SplitEase", Creator: "SplitEase" },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const FALLBACK = { R: "Helvetica", M: "Helvetica", SB: "Helvetica-Bold", B: "Helvetica-Bold", BRAND: "Helvetica-Bold", DR: "Helvetica", DB: "Helvetica-Bold" };
    const font = {};
    for (const k of Object.keys(FALLBACK)) {
      if (fonts[k]) { doc.registerFont(`se-${k}`, fonts[k]); font[k] = `se-${k}`; } else font[k] = FALLBACK[k];
    }
    const setFont = (weight, str) => doc.font(DEVA.test(str) && fonts.DR ? (weight === "R" || weight === "M" ? font.DR : font.DB) : font[weight]);

    const cur = data.group.currency;
    const money = (n) => fmtMoney(n, cur);
    const me = viewerId ? data.members.find((m) => m.userId === String(viewerId)) : null;

    const fit = (s, width, size, spacing = 0) => {
      doc.fontSize(size);
      const w = (t) => doc.widthOfString(t, { characterSpacing: spacing });
      if (w(s) <= width) return s;
      let t = s;
      while (t.length > 1 && w(`${t}…`) > width) t = t.slice(0, -1);
      return `${t.trimEnd()}…`;
    };
    // One text call that handles fonts, truncation and wrapping.
    const T = (str, x, y, o = {}) => {
      const { size = 10, weight = "R", color = K.ink, width, align = "left", spacing = 0, lines = 1 } = o;
      let s = clean(str);
      setFont(weight, s);
      doc.fontSize(size).fillColor(color);
      if (width && lines === 1) s = fit(s, width, size, spacing);
      const opts = { characterSpacing: spacing, align, lineBreak: lines > 1, lineGap: 1.5 };
      if (width) opts.width = width;
      if (lines > 1) { opts.height = lines * size * 1.42; opts.ellipsis = true; }
      doc.text(s, x, y, opts);
    };
    const textH = (str, width, size, weight = "R", lines = 2) => {
      const s = clean(str);
      setFont(weight, s);
      doc.fontSize(size);
      return Math.min(doc.heightOfString(s, { width, lineGap: 1.5 }), lines * size * 1.42);
    };
    const avatar = (name, cx, cy, d) => {
      const [bg, fg] = avatarColors(name);
      doc.circle(cx, cy, d / 2).fill(bg);
      const s = d * 0.4;
      T(initials(name), cx - d / 2, cy - s * 0.62, { size: s, weight: "SB", color: fg, width: d, align: "center" });
    };
    const pill = (label, xRight, cy, { bg, fg, h = 20, size = 8.5 }) => {
      const s = clean(label);
      setFont("SB", s); doc.fontSize(size);
      const w = doc.widthOfString(s) + 18;
      doc.roundedRect(xRight - w, cy - h / 2, w, h, h / 2).fill(bg);
      T(s, xRight - w, cy - size * 0.62, { size, weight: "SB", color: fg, width: w, align: "center" });
      return w;
    };
    const gradientBar = (x, y, w, h) => {
      const g = doc.linearGradient(x, y, x + w, y);
      g.stop(0, K.cyanBright).stop(1, K.violetBright);
      doc.rect(x, y, w, h).fill(g);
    };

    let y = 0;
    const runningHeader = () => {
      if (logoLight || logo) doc.image(logoLight || logo, M, 22, { width: 20, height: 20 });
      doc.font(font.BRAND).fontSize(12).fillColor(K.ink).text("SplitEase", M + 27, 27, { lineBreak: false });
      T(data.group.name, M + 200, 24, { size: 8.5, weight: "SB", color: K.ink, width: CW - 200, align: "right" });
      T("Settlement statement", M + 200, 35, { size: 7.5, color: K.mute, width: CW - 200, align: "right" });
      doc.moveTo(M, 56).lineTo(W - M, 56).lineWidth(0.6).strokeColor(K.line).stroke();
    };
    const newPage = () => { doc.addPage(); runningHeader(); y = 78; };
    const ensure = (h) => { if (y + h > BOTTOM) newPage(); };
    const section = (title, icon, note = "") => {
      ensure(70);
      y += 8;
      drawIconBadge(doc, icon, M + 11, y + 9, 22, { bg: K.cyanSoft, fg: K.cyan, ratio: 0.55 });
      T(title, M + 30, y + 2, { size: 12.5, weight: "B", color: K.ink, width: 300 });
      if (note) T(note, M + 300, y + 4, { size: 8.5, color: K.mute, width: CW - 300, align: "right" });
      y += 30;
    };

    // ── Page 1 header band ──
    const band = doc.linearGradient(0, 0, W, 132);
    band.stop(0, K.night).stop(1, K.night2);
    doc.rect(0, 0, W, 132).fill(band);
    if (logo) doc.image(logo, M - 4, 36, { width: 58, height: 58 });
    doc.font(font.BRAND).fontSize(24).fillColor("#FFFFFF").text("SplitEase", M + 64, 44, { lineBreak: false });
    T("SETTLEMENT STATEMENT", M + 65, 76, { size: 8, weight: "SB", color: "#67E8F9", spacing: 1.6 });
    const meta = [
      me ? ["PREPARED FOR", me.name] : null,
      ["ISSUED", fmtDate(data.completedAt)],
      refId ? ["REFERENCE", refId] : null,
    ].filter(Boolean);
    meta.forEach(([k, v], i) => {
      const my = 34 + i * 26;
      T(k, W - M - 190, my, { size: 6.5, weight: "SB", color: "#94A3B8", spacing: 1, width: 190, align: "right" });
      T(v, W - M - 190, my + 9, { size: 9.5, weight: "SB", color: "#FFFFFF", width: 190, align: "right" });
    });
    gradientBar(0, 132, W, 3);
    y = 162;

    // ── Title + facts ──
    T(data.group.name, M, y, { size: 24, weight: "B", color: K.ink, width: CW });
    y += 38;
    const facts = [
      ["receipt", `${cap(data.group.type)} group`],
      ["users", `${data.totals.memberCount} member${data.totals.memberCount === 1 ? "" : "s"}`],
      data.period ? ["calendar", `${fmtShortDate(data.period.from)} – ${fmtDate(data.period.to)}${data.totals.days > 1 ? ` · ${data.totals.days} days` : ""}`] : null,
      ["wallet", `Amounts in ${cur}`],
    ].filter(Boolean);
    let fx = M;
    for (const [icon, label] of facts) {
      const s = clean(label);
      setFont("M", s); doc.fontSize(8.5);
      const w = doc.widthOfString(s) + 34;
      if (fx + w > W - M) { fx = M; y += 28; }
      doc.roundedRect(fx, y, w, 22, 11).fill(K.wash);
      drawIcon(doc, icon, fx + 9, y + 5.5, 11, K.cyan);
      T(s, fx + 25, y + 6.5, { size: 8.5, weight: "M", color: K.body });
      fx += w + 7;
    }
    y += 40;

    // ── Status hero ──
    {
      const ok = data.fullySettled;
      const h = 96;
      doc.roundedRect(M, y, CW, h, 14).fillAndStroke(ok ? K.greenSoft : K.cyanSoft, ok ? K.greenLine : K.cyanLine);
      drawIconBadge(doc, ok ? "check" : "clock", M + 38, y + 38, 40, { bg: ok ? K.green : K.cyan, fg: "#FFFFFF", ratio: 0.5 });
      const tx = M + 74, tw = CW - 74 - 22;
      T(ok ? "All settled up" : `${money(data.totals.outstanding)} left to settle`, tx, y + 20, { size: 17, weight: "B", color: K.ink, width: tw });
      T(ok
        ? "Every balance in this group is zero. Nobody owes anything."
        : `${data.remaining.length} payment${data.remaining.length === 1 ? "" : "s"} will clear every balance. See "Settle up" below.`,
        tx, y + 43, { size: 9.5, color: K.body, width: tw });
      // progress of paying back
      const by = y + 70, pct = Math.max(0, Math.min(100, data.totals.settledPct));
      doc.roundedRect(tx, by, tw - 80, 6, 3).fill("#FFFFFF");
      if (pct > 0) doc.roundedRect(tx, by, Math.max(6, ((tw - 80) * pct) / 100), 6, 3).fill(ok ? K.green : K.cyan);
      T(`${pct}% paid back`, tx + tw - 74, by - 3, { size: 8.5, weight: "SB", color: ok ? K.green : K.cyanDark, width: 74, align: "right" });
      y += h + 18;
    }

    // ── Your position (personal copy) ──
    if (me) {
      const pays = data.remaining.filter((t) => t.fromId === me.userId);
      const gets = data.remaining.filter((t) => t.toId === me.userId);
      const todo = [...pays.map((t) => ["Pay", t.to, t.amount, K.red]), ...gets.map((t) => ["From", t.from, t.amount, K.green])];
      const shown = todo.slice(0, 4);
      const h = Math.max(104, 62 + shown.length * 20 + (todo.length > 4 ? 14 : 0));
      ensure(h + 18);
      doc.roundedRect(M, y, CW, h, 14).fillAndStroke("#FFFFFF", K.line);
      doc.save(); doc.roundedRect(M, y, CW, h, 14).clip(); gradientBar(M, y, 4, h); doc.restore();
      drawIconBadge(doc, "user", M + 30, y + 26, 24, { bg: K.violetSoft, fg: K.violet, ratio: 0.55 });
      T("YOUR POSITION", M + 48, y + 21, { size: 7.5, weight: "SB", color: K.mute, spacing: 1.2 });
      const bal = me.finalBalance;
      const settledMe = data.fullySettled || Math.abs(bal) < 0.01;
      T(settledMe ? "You're all square" : bal < 0 ? `You pay ${money(-bal)}` : `You receive ${money(bal)}`,
        M + 20, y + 42, { size: 18, weight: "B", color: settledMe ? K.green : bal < 0 ? K.red : K.green, width: CW * 0.55 });
      let ly = y + 70;
      for (const [verb, who, amt, col] of shown) {
        drawIcon(doc, "arrowRight", M + 20, ly + 1, 10, col);
        T(`${verb} ${clean(who)}`, M + 36, ly, { size: 9.5, weight: "M", color: K.body, width: CW * 0.3 });
        T(money(amt), M + 36 + CW * 0.3, ly, { size: 9.5, weight: "SB", color: K.ink, width: CW * 0.62 - 36 - CW * 0.3 - 34, align: "right" });
        ly += 20;
      }
      if (todo.length > 4) T(`and ${todo.length - 4} more in "Settle up"`, M + 36, ly, { size: 8.5, color: K.mute });
      if (!todo.length) T("Nothing left for you to pay or collect.", M + 20, ly, { size: 9.5, color: K.body });
      // right column: the numbers behind it
      const rx = M + CW * 0.62, rw = CW * 0.38 - 20;
      doc.moveTo(rx - 14, y + 18).lineTo(rx - 14, y + h - 18).lineWidth(0.6).strokeColor(K.line).stroke();
      [["You paid", money(me.paid)], ["Your share", money(me.share)],
        ["Settled", me.settlementsSent || me.settlementsReceived ? `${me.settlementsSent ? `sent ${money(me.settlementsSent)}` : ""}${me.settlementsSent && me.settlementsReceived ? " · " : ""}${me.settlementsReceived ? `got ${money(me.settlementsReceived)}` : ""}` : "none yet"]]
        .forEach(([k, v], i) => {
          const ry = y + 18 + i * 28;
          T(k, rx, ry, { size: 8, color: K.mute, width: rw });
          T(v, rx, ry + 10, { size: 10.5, weight: "SB", color: K.ink, width: rw });
        });
      y += h + 18;
    }

    // ── KPI cards ──
    {
      ensure(80);
      const gap = 10, cw = (CW - 3 * gap) / 4, h = 74;
      [
        ["wallet", "Total spent", money(data.totals.totalSpent), `${data.totals.expenseCount} expense${data.totals.expenseCount === 1 ? "" : "s"}`],
        ["users", "Per person", money(data.totals.perHead), "average share"],
        ["receipt", "Average bill", money(data.insights?.averageExpense || 0), "per expense"],
        ["swap", "Paid back", money(data.totals.settledAmount), `${data.totals.settlementCount} settlement${data.totals.settlementCount === 1 ? "" : "s"}`],
      ].forEach(([icon, label, value, sub], i) => {
        const x = M + i * (cw + gap);
        doc.roundedRect(x, y, cw, h, 12).fillAndStroke("#FFFFFF", K.line);
        drawIconBadge(doc, icon, x + 23, y + 23, 24, { bg: K.cyanSoft, fg: K.cyan, ratio: 0.55 });
        T(label.toUpperCase(), x + 40, y + 19, { size: 6.8, weight: "SB", color: K.mute, spacing: 0.8, width: cw - 46 });
        T(value, x + 13, y + 41, { size: 13.5, weight: "B", color: K.ink, width: cw - 22 });
        T(sub, x + 13, y + 58, { size: 7.5, color: K.mute, width: cw - 22 });
      });
      y += h + 22;
    }

    // ── Settle up ──
    section("Settle up", "swap", data.remaining.length ? "Fewest payments that clear every balance" : "");
    if (!data.remaining.length) {
      ensure(48);
      doc.roundedRect(M, y, CW, 44, 10).fillAndStroke(K.greenSoft, K.greenLine);
      drawIconBadge(doc, "check", M + 24, y + 22, 22, { bg: K.green, fg: "#FFFFFF", ratio: 0.55 });
      T("Everyone is square. No payments are needed.", M + 44, y + 16, { size: 10, weight: "M", color: K.ink, width: CW - 60 });
      y += 54;
    } else {
      for (const t of data.remaining) {
        ensure(46);
        const mine = me && (t.fromId === me.userId || t.toId === me.userId);
        doc.roundedRect(M, y, CW, 40, 10).fillAndStroke(mine ? K.violetSoft : "#FFFFFF", mine ? "#DDD6FE" : K.line);
        avatar(t.from, M + 24, y + 20, 24);
        T(t.from, M + 42, y + 14, { size: 10, weight: "SB", color: K.ink, width: 140 });
        drawIcon(doc, "arrowRight", M + 192, y + 13, 14, K.faint);
        avatar(t.to, M + 230, y + 20, 24);
        T(t.to, M + 248, y + 14, { size: 10, weight: "SB", color: K.ink, width: 140 });
        T(money(t.amount), M + CW - 130, y + 13, { size: 11.5, weight: "B", color: K.ink, width: 114, align: "right" });
        y += 46;
      }
      y += 6;
    }

    // ── Member balances ──
    // Keep the heading with at least a few rows instead of stranding it.
    ensure(70 + 16 + Math.min(data.members.length, 3) * 46);
    section("Everyone's balance", "users", "Paid minus share, after settlements");
    {
      const head = () => {
        T("MEMBER", M + 14, y, { size: 7, weight: "SB", color: K.mute, spacing: 0.8 });
        T("PAID", M + 205, y, { size: 7, weight: "SB", color: K.mute, spacing: 0.8, width: 80, align: "right" });
        T("SHARE", M + 290, y, { size: 7, weight: "SB", color: K.mute, spacing: 0.8, width: 80, align: "right" });
        T("BALANCE", M + CW - 124, y, { size: 7, weight: "SB", color: K.mute, spacing: 0.8, width: 110, align: "right" });
        y += 16;
      };
      head();
      data.members.forEach((r, i) => {
        if (y + 46 > BOTTOM) { newPage(); head(); }
        if (i % 2 === 0) doc.roundedRect(M, y, CW, 44, 8).fill(K.page);
        const isMe = me && r.userId === me.userId;
        avatar(r.name, M + 26, y + 22, 26);
        T(r.name, M + 46, y + 10, { size: 10, weight: "SB", color: K.ink, width: isMe ? 110 : 150 });
        if (isMe) {
          setFont("SB", r.name); doc.fontSize(10);
          const nx = M + 46 + Math.min(doc.widthOfString(fit(clean(r.name), 110, 10)), 110) + 6;
          doc.roundedRect(nx, y + 9, 26, 13, 6.5).fill(K.violetSoft);
          T("You", nx, y + 11.5, { size: 7, weight: "SB", color: K.violet, width: 26, align: "center" });
        }
        const pct = data.totals.totalSpent ? Math.round((r.paid / data.totals.totalSpent) * 100) : 0;
        const extra = [r.settlementsSent ? `sent ${money(r.settlementsSent)}` : "", r.settlementsReceived ? `got ${money(r.settlementsReceived)}` : ""].filter(Boolean).join(" · ");
        T(`${pct}% of spending${extra ? ` · ${extra}` : ""}`, M + 46, y + 25, { size: 7.5, color: K.mute, width: 155 });
        T(money(r.paid), M + 205, y + 16, { size: 9.5, weight: "M", color: K.ink, width: 80, align: "right" });
        T(money(r.share), M + 290, y + 16, { size: 9.5, weight: "M", color: K.ink, width: 80, align: "right" });
        const b = r.finalBalance;
        const zero = data.fullySettled || Math.abs(b) < 0.01;
        pill(zero ? "Settled" : b < 0 ? `Pays ${money(-b)}` : `Gets ${money(b)}`, M + CW - 14, y + 22,
          zero ? { bg: K.wash, fg: K.mute } : b < 0 ? { bg: K.redSoft, fg: K.red } : { bg: K.greenSoft, fg: K.green });
        y += 46;
      });
      y += 8;
    }

    // ── Where the money went ──
    if (data.categories.length) {
      section("Where the money went", "pieChart");
      data.categories.forEach((c, i) => {
        ensure(26);
        const pct = data.totals.totalSpent ? (c.amount / data.totals.totalSpent) * 100 : 0;
        T(cap(c.name), M, y + 1, { size: 9.5, weight: "M", color: K.ink, width: 110 });
        const bx = M + 118, bw = CW - 118 - 150;
        doc.roundedRect(bx, y + 3, bw, 8, 4).fill(K.wash);
        doc.roundedRect(bx, y + 3, Math.max(8, (bw * pct) / 100), 8, 4).fill(BARS[i % BARS.length]);
        T(`${pct.toFixed(pct >= 10 ? 0 : 1)}%`, bx + bw + 10, y + 1, { size: 9, weight: "SB", color: K.ink, width: 44, align: "right" });
        T(money(c.amount), bx + bw + 58, y + 1, { size: 9, color: K.mute, width: 92, align: "right" });
        y += 24;
      });
      y += 8;
    }

    // ── Insights ──
    const ins = data.insights || {};
    const cards = [
      ins.biggestExpense && ["receipt", "Biggest expense", ins.biggestExpense.description, `${money(ins.biggestExpense.amount)} · paid by ${clean(ins.biggestExpense.paidBy)}`],
      ins.topContributor && ["award", "Top contributor", ins.topContributor.name, `${money(ins.topContributor.amount)} · ${ins.topContributor.pct}% of all spending`],
      ins.busiestDay && ["calendar", "Busiest day", fmtDate(ins.busiestDay.date), `${money(ins.busiestDay.amount)} across ${ins.busiestDay.count} expense${ins.busiestDay.count === 1 ? "" : "s"}`],
      ins.topCategory && ["trendingUp", "Top category", cap(ins.topCategory.name), `${money(ins.topCategory.amount)} · ${ins.topCategory.pct}% of spending`],
    ].filter(Boolean);
    if (cards.length) {
      section("Highlights", "sparkles");
      const gap = 12, cw = (CW - gap) / 2, h = 62;
      cards.forEach((c, i) => {
        if (i % 2 === 0) ensure(h + 12);
        const x = M + (i % 2) * (cw + gap);
        const [icon, label, value, sub] = c;
        doc.roundedRect(x, y, cw, h, 12).fillAndStroke("#FFFFFF", K.line);
        drawIconBadge(doc, icon, x + 26, y + 31, 30, { bg: K.violetSoft, fg: K.violet, ratio: 0.5 });
        T(label.toUpperCase(), x + 50, y + 13, { size: 6.8, weight: "SB", color: K.mute, spacing: 0.8, width: cw - 62 });
        T(value, x + 50, y + 25, { size: 11, weight: "B", color: K.ink, width: cw - 62 });
        T(sub, x + 50, y + 41, { size: 8, color: K.mute, width: cw - 62 });
        if (i % 2 === 1 || i === cards.length - 1) y += h + 12;
      });
      y += 4;
    }

    // ── Settlements recorded ──
    if (data.settlements.length) {
      section("Payments already made", "check", `${data.settlements.length} recorded in the app`);
      for (const st of data.settlements) {
        ensure(34);
        doc.roundedRect(M, y, CW, 30, 8).fillAndStroke("#FFFFFF", K.line);
        T(fmtDate(st.date), M + 12, y + 10, { size: 8.5, color: K.mute, width: 70 });
        T(st.from, M + 86, y + 9.5, { size: 9.5, weight: "SB", color: K.ink, width: 120 });
        drawIcon(doc, "arrowRight", M + 210, y + 9, 12, K.faint);
        T(st.to, M + 230, y + 9.5, { size: 9.5, weight: "SB", color: K.ink, width: 120 });
        pill(st.method, M + 420, y + 15, { bg: K.cyanSoft, fg: K.cyanDark, h: 16, size: 7.5 });
        T(money(st.amount), M + CW - 92, y + 9.5, { size: 10, weight: "B", color: K.ink, width: 80, align: "right" });
        y += 36;
      }
      y += 6;
    }

    // ── Every expense ──
    section("Every expense", "receipt", `${data.spending.length} item${data.spending.length === 1 ? "" : "s"} · ${money(data.totals.totalSpent)}`);
    {
      const cols = { date: M + 10, desc: M + 60, payer: M + 218, split: M + 304, amt: M + CW - 78 };
      const SPLIT_W = cols.amt - cols.split - 10;
      const head = () => {
        doc.roundedRect(M, y, CW, 22, 6).fill(K.wash);
        [["DATE", cols.date], ["EXPENSE", cols.desc], ["PAID BY", cols.payer], ["SPLIT", cols.split]].forEach(([l, x]) =>
          T(l, x, y + 7.5, { size: 6.8, weight: "SB", color: K.mute, spacing: 0.8 }));
        T("AMOUNT", cols.amt, y + 7.5, { size: 6.8, weight: "SB", color: K.mute, spacing: 0.8, width: 70, align: "right" });
        y += 26;
      };
      const splitText = (e) => {
        const n = e.splitAmong.length;
        if (!n) return "-";
        const equal = e.splitAmong.every((s) => Math.abs(s.share - e.splitAmong[0].share) < 0.02);
        if (equal) return `${n === data.totals.memberCount ? "Everyone" : `${n} people`} · ${money(e.splitAmong[0].share)} each`;
        return e.splitAmong.map((s) => `${clean(s.name).split(" ")[0]} ${money(s.share)}`).join(", ");
      };
      if (!data.spending.length) {
        T("No expenses were added.", M, y, { size: 9.5, color: K.mute });
        y += 20;
      } else {
        head();
        data.spending.forEach((e, i) => {
          const sp = splitText(e);
          const rh = Math.max(34, Math.max(textH(sp, SPLIT_W, 8, "R", 3), textH(e.paidBy, 80, 8.5, "M", 2) + 2) + 16);
          if (y + rh > BOTTOM) { newPage(); head(); }
          if (i % 2 === 1) doc.rect(M, y, CW, rh).fill(K.page);
          T(fmtShortDate(e.date), cols.date, y + 8, { size: 8.5, color: K.mute, width: 50 });
          T(e.description, cols.desc, y + 7, { size: 9.5, weight: "SB", color: K.ink, width: 150 });
          T(`${cap(e.category)}${e.notes ? ` · ${e.notes}` : ""}`, cols.desc, y + 20, { size: 7.5, color: K.mute, width: 150 });
          T(e.paidBy, cols.payer, y + 8, { size: 8.5, weight: "M", color: K.body, width: 80, lines: 2 });
          T(sp, cols.split, y + 8, { size: 8, color: K.body, width: SPLIT_W, lines: 3 });
          T(money(e.amount), cols.amt, y + 7, { size: 10, weight: "B", color: K.ink, width: 70, align: "right" });
          y += rh;
          doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.4).strokeColor(K.line).stroke();
        });
        ensure(30);
        y += 8;
        T("Total", cols.split, y, { size: 9.5, weight: "SB", color: K.mute, width: SPLIT_W });
        T(money(data.totals.totalSpent), cols.amt - 30, y - 1, { size: 12, weight: "B", color: K.ink, width: 100, align: "right" });
        y += 26;
      }
    }

    // ── How to read this ──
    {
      const lines = [
        ["Paid", "money a member put in for the group's expenses."],
        ["Share", "their part of every expense, as it was split."],
        ["Balance", "paid minus share, after settlements. \"Gets\" means they receive money, \"Pays\" means they still owe."],
        ["Settle up", "the fewest payments that bring every balance to zero."],
      ];
      const rowH = lines.map(([, v]) => textH(v, CW - 120, 8.5, "R", 2) + 6);
      const h = 44 + rowH.reduce((a, b) => a + b, 0);
      ensure(h + 30);
      y += 6;
      doc.roundedRect(M, y, CW, h, 12).fill(K.page);
      drawIcon(doc, "info", M + 16, y + 14, 14, K.cyan);
      T("How to read this statement", M + 38, y + 15, { size: 10, weight: "SB", color: K.ink });
      let ly = y + 38;
      lines.forEach(([k, v], i) => {
        T(k, M + 38, ly, { size: 8.5, weight: "SB", color: K.ink, width: 60 });
        T(v, M + 100, ly, { size: 8.5, color: K.body, width: CW - 120, lines: 2 });
        ly += rowH[i];
      });
      y += h + 14;
      T(`Generated by SplitEase on ${fmtDate(data.completedAt)}${data.completedByName ? ` · ${clean(data.completedByName)}` : ""}. Figures come straight from the group's expenses in the app.`,
        M, y, { size: 7.5, color: K.faint, width: CW, lines: 2 });
    }

    // ── Footer on every page ──
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.moveTo(M, H - 42).lineTo(W - M, H - 42).lineWidth(0.6).strokeColor(K.line).stroke();
      doc.font(font.BRAND).fontSize(8.5).fillColor(K.cyan).text("SplitEase", M, H - 32, { lineBreak: false });
      T(`Settlement statement · ${clean(data.group.name)}${refId ? ` · Ref ${refId}` : ""}`, M + 58, H - 31.5, { size: 7.5, color: K.mute, width: CW - 150 });
      T(`Page ${i + 1} of ${range.count}`, W - M - 90, H - 31.5, { size: 7.5, weight: "M", color: K.mute, width: 90, align: "right" });
    }
    doc.end();
  });
}
