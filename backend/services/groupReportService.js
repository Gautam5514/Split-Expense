import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { escapeHtml } from "../middleware/validate.js";
import { buildReportData, fmtMoney, fmtDate } from "../utils/settlementReport.js";
import { publicWebUrl } from "../utils/publicUrl.js";

// Content layer for settlement statements: load the ledger, identify its
// state, and write each member's email. Sending lives in statementOutbox.js.

export async function loadGroupAndReport(groupId, { completedByName = "", completedAt = null } = {}) {
  const group = await Group.findById(groupId).populate("members", "name email").lean();
  if (!group) return null;
  const expenses = await Expense.find({ groupId }).lean();
  const data = buildReportData({
    group,
    members: group.members || [],
    expenses,
    completedByName,
    completedAt: completedAt || new Date(),
  });
  return { group, data };
}

export async function loadGroupReport(groupId, opts) {
  const r = await loadGroupAndReport(groupId, opts);
  return r ? r.data : null;
}

// Identifies the ledger state a statement describes. Same signature = same
// statement, so it is never emailed twice (e.g. group fully settled, then
// marked completed a minute later).
export const reportSignature = (d) =>
  `${d.totals.expenseCount}:${d.totals.totalSpent}:${d.totals.settledAmount}:${d.fullySettled ? 1 : 0}`;

export const reportFileName = (data) =>
  `SplitEase-Statement-${String(data.group.name).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Group"}.pdf`;

// Links in emails must work outside the server, so never a localhost origin.
export const appBaseUrl = () => publicWebUrl();

const COPY = {
  completed: {
    subject: (g) => `${g} is complete - your settlement statement`,
    eyebrow: "Group completed",
    title: (g) => `"${g}" is complete`,
    intro: (by, d) => `${by ? `<strong>${by}</strong> marked` : "The group was marked"} this ${d.type} group as completed on ${d.date}. Here is exactly where everyone stands.`,
  },
  settled: {
    subject: (g) => `${g} is fully settled - your final statement`,
    eyebrow: "Fully settled",
    title: (g) => `"${g}" is fully settled`,
    intro: (by, d) => `The last payment was confirmed${by ? ` by <strong>${by}</strong>` : ""} on ${d.date}. Every balance in the group is now zero.`,
  },
  manual: {
    subject: (g) => `${g} - your settlement statement`,
    eyebrow: "Statement",
    title: (g) => `Your statement for "${g}"`,
    intro: (by, d) => `${by ? `<strong>${by}</strong> shared` : "Here is"} the latest statement for this ${d.type} group (${d.date}).`,
  },
};

// Brand: black/white, cyan #0891B2, violet from the logo. No emoji: icons are
// small PNGs embedded in the email (cid:), so they show in every mail app.
const X = {
  ink: "#111111", body: "#3F3F46", mute: "#71717A", faint: "#A1A1AA", line: "#E4E4E7", wash: "#F4F4F5", page: "#FAFAFA",
  cyan: "#0891B2", cyanDark: "#0E7490", cyanSoft: "#ECFEFF", cyanLine: "#A5F3FC",
  violet: "#7C3AED", violetSoft: "#F5F3FF", green: "#16A34A", greenSoft: "#F0FDF4", greenLine: "#BBF7D0",
  red: "#DC2626", redSoft: "#FEF2F2", night: "#0B0F17",
};
const FONT = `Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const BRAND_FONT = `'Josefin Sans',Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

const EMAIL_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "email");
const imageCache = new Map();
/** Inline image attachments (cid:se-<name>) for the names an email uses. */
export function emailImageAttachments(names) {
  const out = [];
  for (const name of new Set(names)) {
    if (!imageCache.has(name)) {
      try { imageCache.set(name, fs.readFileSync(path.join(EMAIL_ASSETS, `${name}.png`))); } catch { imageCache.set(name, null); }
    }
    const content = imageCache.get(name);
    if (content) out.push({ filename: `${name}.png`, content, contentType: "image/png", cid: `se-${name}` });
  }
  return out;
}

/**
 * One member's email. Returns { subject, html, text, images } where `images`
 * lists the inline icons the HTML references (see emailImageAttachments).
 * `data` may be a stored snapshot, so dates can arrive as strings.
 */
export function buildMemberEmail(data, member, { appUrl = appBaseUrl(), reason = "completed", refId = "", fileName = "" } = {}) {
  const copy = COPY[reason] || COPY.completed;
  const e = escapeHtml;
  const cur = data.group.currency;
  const m = (n) => fmtMoney(n, cur);
  const gname = e(data.group.name);
  const images = ["logo", "file"];
  const img = (name, size, alt = "") => { images.push(name); return `<img src="cid:se-${name}" width="${size}" height="${size}" alt="${alt}" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;">`; };

  const pays = data.remaining.filter((t) => t.fromId === member.userId);
  const gets = data.remaining.filter((t) => t.toId === member.userId);
  const bal = member.finalBalance;
  const square = data.fullySettled || Math.abs(bal) < 0.01;
  const ok = data.fullySettled;
  const pct = Math.max(0, Math.min(100, data.totals.settledPct ?? (ok ? 100 : 0)));

  // ── group status
  const status = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ok ? X.greenSoft : X.cyanSoft};border:1px solid ${ok ? X.greenLine : X.cyanLine};border-radius:14px;">
      <tr><td style="padding:18px 18px 16px;" valign="top" width="44">${img(ok ? "status-settled" : "status-pending", 40, ok ? "Settled" : "Pending")}</td>
      <td style="padding:18px 18px 16px 4px;" valign="top">
        <div style="font:700 18px/1.3 ${FONT};color:${X.ink};">${ok ? "All settled up" : `${e(m(data.totals.outstanding))} left to settle`}</div>
        <div style="font:400 13px/1.5 ${FONT};color:${X.body};margin-top:2px;">${ok ? "Every balance in this group is zero." : `${data.remaining.length} payment${data.remaining.length === 1 ? "" : "s"} will clear every balance.`}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
          <td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:4px;"><tr>
            ${pct > 0 ? `<td width="${pct}%" style="background:${ok ? X.green : X.cyan};height:6px;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>` : ""}
            ${pct < 100 ? `<td style="height:6px;font-size:0;line-height:0;">&nbsp;</td>` : ""}
          </tr></table></td>
          <td width="96" align="right" style="font:600 12px ${FONT};color:${ok ? X.green : X.cyanDark};white-space:nowrap;padding-left:10px;">${pct}% paid back</td>
        </tr></table>
      </td></tr>
    </table>`;

  // ── this member's position
  const verdict = square ? ["You're all square", X.green] : bal < 0 ? [`You pay ${m(-bal)}`, X.red] : [`You receive ${m(bal)}`, X.green];
  const action = (verb, who, amt, icon) => `
      <tr><td width="22" style="padding:7px 0;" valign="middle">${img(icon, 14)}</td>
        <td style="padding:7px 0;font:500 14px ${FONT};color:${X.body};">${verb} <strong style="color:${X.ink};">${e(who)}</strong></td>
        <td align="right" style="padding:7px 0;font:700 14px ${FONT};color:${X.ink};white-space:nowrap;">${e(m(amt))}</td></tr>`;
  const actions = [...pays.map((t) => action("Pay", t.to, t.amount, "arrow-red")), ...gets.map((t) => action("Collect from", t.from, t.amount, "arrow-green"))].join("");
  const tile = (k, v) => `<td width="33%" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${X.page};border:1px solid ${X.line};border-radius:10px;"><tr><td style="padding:10px 12px;">
      <div style="font:600 10px ${FONT};color:${X.mute};letter-spacing:.8px;text-transform:uppercase;">${k}</div>
      <div style="font:700 15px/1.4 ${FONT};color:${X.ink};margin-top:3px;white-space:nowrap;">${e(v)}</div></td></tr></table></td>`;
  // Third tile: what already moved, if anything - a bare "Net -5,500" next to
  // "You're all square" reads like a contradiction.
  const third = member.settlementsSent > 0 ? tile("You paid back", m(member.settlementsSent))
    : member.settlementsReceived > 0 ? tile("You received", m(member.settlementsReceived))
      : tile("Net", m(member.net));
  const position = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${X.line};border-left:4px solid ${X.violet};border-radius:14px;margin-top:16px;">
      <tr><td style="padding:16px 18px 6px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle">${img("user", 26)}</td>
          <td style="padding-left:10px;font:600 11px ${FONT};color:${X.mute};letter-spacing:1.2px;text-transform:uppercase;" valign="middle">Your position</td></tr></table>
        <div style="font:800 24px/1.3 ${FONT};color:${verdict[1]};margin:10px 0 4px;">${e(verdict[0])}</div>
        ${actions ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">${actions}</table>` : `<div style="font:400 13px ${FONT};color:${X.body};margin-bottom:8px;">Nothing left for you to pay or collect.</div>`}
      </td></tr>
      <tr><td style="padding:6px 14px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${tile("You paid", m(member.paid))}${tile("Your share", m(member.share))}${third}
      </tr></table></td></tr>
    </table>`;

  // ── everyone
  const rows = data.members.map((r, i) => {
    const b = r.finalBalance;
    // 1-paisa rounding leftovers read as settled once the group is settled.
    const zero = data.fullySettled || Math.abs(b) < 0.01;
    const [bg, fg, label] = zero ? [X.wash, X.mute, "Settled"] : b < 0 ? [X.redSoft, X.red, `Pays ${m(-b)}`] : [X.greenSoft, X.green, `Gets ${m(b)}`];
    const me = r.userId === member.userId;
    return `<tr style="background:${i % 2 === 0 ? X.page : "#FFFFFF"};">
      <td style="padding:10px 12px;font:600 13px ${FONT};color:${X.ink};">${e(r.name)}${me ? ` <span style="font:600 10px ${FONT};color:${X.violet};background:${X.violetSoft};border-radius:8px;padding:2px 7px;">You</span>` : ""}</td>
      <td align="right" style="padding:10px 8px;font:500 13px ${FONT};color:${X.body};white-space:nowrap;">${e(m(r.paid))}</td>
      <td align="right" style="padding:10px 12px;white-space:nowrap;"><span style="font:600 12px ${FONT};color:${fg};background:${bg};border-radius:12px;padding:4px 10px;">${e(label)}</span></td></tr>`;
  }).join("");
  const everyone = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 10px;"><tr><td valign="middle">${img("users", 26)}</td>
      <td style="padding-left:10px;font:700 16px ${FONT};color:${X.ink};" valign="middle">Everyone in ${gname}</td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${X.line};border-radius:12px;overflow:hidden;">
      <tr><td style="padding:8px 12px;font:600 10px ${FONT};color:${X.mute};letter-spacing:.8px;text-transform:uppercase;">Member</td>
        <td align="right" style="padding:8px;font:600 10px ${FONT};color:${X.mute};letter-spacing:.8px;text-transform:uppercase;">Paid</td>
        <td align="right" style="padding:8px 12px;font:600 10px ${FONT};color:${X.mute};letter-spacing:.8px;text-transform:uppercase;">Balance</td></tr>
      ${rows}
    </table>`;

  const period = data.period ? `${fmtDate(data.period.from)} – ${fmtDate(data.period.to)}` : "";
  const fact = (k, v) => `<tr><td style="padding:5px 0;font:400 13px ${FONT};color:${X.mute};">${k}</td><td align="right" style="padding:5px 0;font:600 13px ${FONT};color:${X.ink};">${v}</td></tr>`;
  const facts = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
      ${fact("Total spent", e(m(data.totals.totalSpent)))}
      ${fact("Expenses", `${data.totals.expenseCount}`)}
      ${fact("Members", `${data.totals.memberCount}`)}
      ${period ? fact("Period", e(period)) : ""}
    </table>`;

  const attachment = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${X.page};border:1px solid ${X.line};border-radius:12px;margin-top:22px;"><tr>
      <td width="36" style="padding:14px 0 14px 14px;" valign="middle">${img("file", 36)}</td>
      <td style="padding:14px;" valign="middle">
        <div style="font:600 14px ${FONT};color:${X.ink};">Your full statement is attached</div>
        <div style="font:400 12px/1.5 ${FONT};color:${X.mute};margin-top:2px;">${fileName ? `${e(fileName)} · ` : ""}every expense, who paid, how it was split, payments made and who pays whom.</div>
      </td></tr></table>`;

  const preheader = square ? `You're all square in ${data.group.name}. Your full statement is attached.`
    : bal < 0 ? `You pay ${m(-bal)} in ${data.group.name}. Your full statement is attached.`
      : `You receive ${m(bal)} in ${data.group.name}. Your full statement is attached.`;
  const subject = copy.subject(data.group.name);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${X.wash};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${X.wash};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid ${X.line};">
    <tr><td style="background:${X.night};padding:24px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="48" valign="middle">${img("logo", 44, "SplitEase")}</td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font:700 22px/1.1 ${BRAND_FONT};color:#FFFFFF;">SplitEase</div>
          <div style="font:600 10px ${FONT};color:#67E8F9;letter-spacing:1.6px;margin-top:4px;">SETTLEMENT STATEMENT</div></td>
        <td align="right" valign="middle" style="font:600 10px ${FONT};color:#94A3B8;letter-spacing:1px;text-transform:uppercase;">${e(copy.eyebrow)}<br><span style="font:600 13px ${FONT};color:#FFFFFF;letter-spacing:0;text-transform:none;">${e(fmtDate(data.completedAt))}</span></td>
      </tr></table></td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${X.cyan};background-image:linear-gradient(90deg,#22D3EE,#A78BFA);">&nbsp;</td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <div style="font:500 14px ${FONT};color:${X.mute};">Hi ${e(member.name)},</div>
      <h1 style="margin:6px 0 8px;font:800 24px/1.3 ${FONT};color:${X.ink};">${copy.title(gname)}</h1>
      <p style="margin:0 0 20px;font:400 14px/1.6 ${FONT};color:${X.body};">${copy.intro(e(data.completedByName), { type: e(data.group.type), date: e(fmtDate(data.completedAt)) })}</p>
      ${status}
      ${position}
      ${everyone}
      ${facts}
      ${attachment}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;"><tr><td align="center">
        <a href="${e(appUrl)}/groups/${e(data.group.id)}" style="display:inline-block;background:${X.cyan};color:#FFFFFF;font:700 15px ${FONT};text-decoration:none;padding:14px 34px;border-radius:12px;">Open ${gname} in SplitEase</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:18px 28px 22px;border-top:1px solid ${X.line};background:${X.page};">
      <div style="font:700 13px ${BRAND_FONT};color:${X.cyan};">SplitEase</div>
      <div style="font:400 11px/1.6 ${FONT};color:${X.faint};margin-top:4px;">Sent to ${e(member.email)} because you're a member of ${gname}.${refId ? ` Reference ${e(refId)}.` : ""}</div>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const text = [
    `Hi ${member.name},`,
    "",
    subject,
    "",
    ok ? "Group status: all settled up." : `Group status: ${m(data.totals.outstanding)} left to settle (${pct}% paid back).`,
    square ? "You're all square." : bal < 0 ? `You pay ${m(-bal)}.` : `You receive ${m(bal)}.`,
    ...pays.map((t) => `- Pay ${t.to}: ${m(t.amount)}`),
    ...gets.map((t) => `- Collect from ${t.from}: ${m(t.amount)}`),
    "",
    `You paid ${m(member.paid)} | your share ${m(member.share)} | net ${m(member.net)}`,
    `Group total: ${m(data.totals.totalSpent)} across ${data.totals.expenseCount} expenses.`,
    "",
    "Your full statement is attached as a PDF.",
    `${appUrl}/groups/${data.group.id}`,
    refId ? `Reference ${refId}` : "",
  ].join("\n").trim();

  return { subject, html, text, images: [...new Set(images)] };
}
