import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { escapeHtml } from "../middleware/validate.js";
import { buildReportData, fmtDate } from "../utils/settlementReport.js";
import { publicWebUrl } from "../utils/publicUrl.js";

// Content layer for settlement statements: load the ledger, identify its
// state, and write each member's email. Sending lives in statementOutbox.js.

export async function loadGroupAndReport(groupId, { completedByName = "", completedAt = null } = {}) {
  const group = await Group.findById(groupId).populate("members", "name email photoURL").lean();
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

// The email is a short note: what happened to the group, where this member
// stands, and that the PDF is attached. All the detail lives in the PDF.
const COPY = {
  completed: {
    subject: (g) => `${g} is complete - your settlement statement`,
    eyebrow: "Group completed",
    title: (g) => `"${g}" is complete`,
    ending: (by, date) => `${by ? `<strong>${by}</strong> marked it complete` : "It was marked complete"} on ${date}.`,
    endingText: (by, date) => `${by ? `${by} marked it complete` : "It was marked complete"} on ${date}.`,
  },
  settled: {
    subject: (g) => `${g} is fully settled - your final statement`,
    eyebrow: "Fully settled",
    title: (g) => `"${g}" is fully settled`,
    ending: (by, date) => `The last payment was confirmed${by ? ` by <strong>${by}</strong>` : ""} on ${date}, so every balance is now zero.`,
    endingText: (by, date) => `The last payment was confirmed${by ? ` by ${by}` : ""} on ${date}, so every balance is now zero.`,
  },
  manual: {
    subject: (g) => `${g} - your settlement statement`,
    eyebrow: "Statement",
    title: (g) => `Your statement for "${g}"`,
    ending: (by, date) => `${by ? `<strong>${by}</strong> shared` : "Here is"} where it stands as of ${date}.`,
    endingText: (by, date) => `${by ? `${by} shared` : "Here is"} where it stands as of ${date}.`,
  },
};

// No emoji in emails: images are small PNGs embedded in the message (cid:), so they show in every mail app.
const EMAIL_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "email");
const imageCache = new Map();
/** Inline image attachments (cid:se-<name>) for the names an email uses. */
export function emailImageAttachments(names, avatarImages = new Map()) {
  const out = [];
  for (const name of new Set(names)) {
    if (name.startsWith("avatar-")) {
      const content = avatarImages.get(name.slice(7));
      if (content) out.push({ filename: `${name}.png`, content, contentType: content[0] === 137 ? "image/png" : "image/jpeg", cid: `se-${name}` });
      continue;
    }
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
 * lists the inline images the HTML references (see emailImageAttachments).
 * `data` may be a stored snapshot, so dates can arrive as strings and newer
 * fields (group.createdAt) can be missing.
 *
 * As plain as the sign-in code email (utils/otpEmail.js): logo, name, one
 * short message. No balances, tables or buttons: the PDF that travels with it
 * has every number.
 */
export function buildMemberEmail(data, member, { appUrl = appBaseUrl(), reason = "completed", refId = "" } = {}) {
  const copy = COPY[reason] || COPY.completed;
  const e = escapeHtml;
  const gname = e(data.group.name);
  const when = fmtDate(data.completedAt);
  const kind = data.group.type && data.group.type !== "general" ? `${data.group.type} group` : "group";
  const count = data.totals.memberCount;
  const people = `${count} member${count === 1 ? "" : "s"}`;
  const created = data.group.createdAt ? fmtDate(data.group.createdAt) : "";

  // When it began, who was in it, how it ended. The person who did it reads "You".
  const began = created ? `This ${kind} was created on ${created} with ${people}.` : `This ${kind} has ${people}.`;
  const mine = !!data.completedByName && data.completedByName.trim() === String(member.name || "").trim();
  const by = mine ? "You" : data.completedByName;
  const first = String(member.name || "").trim().split(/\s+/)[0] || "there";
  const subject = copy.subject(data.group.name);
  const link = `${appUrl}/groups/${data.group.id}`;
  const ink = "#17212B", soft = "#52606D", faint = "#687582";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${e(subject)}</title>
<style>@media(max-width:480px){.email-padding{padding:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#FFFFFF;color:${ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(`${data.group.name}: your statement is attached as a PDF.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#FFFFFF;">
<tr><td class="email-padding" style="padding:30px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="44" style="padding-right:10px;"><img src="cid:se-logo-light" width="36" height="36" alt="" style="display:block;border:0;"></td>
    <td style="font-size:21px;font-weight:700;letter-spacing:-.5px;color:${ink};">SplitEase</td>
  </tr></table>
  <h1 style="margin:28px 0 10px;font-size:25px;line-height:1.3;font-weight:700;color:${ink};">${copy.title(gname)}</h1>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${soft};">Hi ${e(first)}, ${e(began.charAt(0).toLowerCase() + began.slice(1))} ${copy.ending(e(by), e(when)).replaceAll("<strong>", `<strong style="color:${ink};">`)}</p>
  <p style="margin:0;font-size:15px;line-height:1.6;color:${soft};">Your full statement is attached as a <strong style="color:${ink};">PDF</strong>.</p>
  <div style="margin-top:26px;padding-top:8px;">
    <p style="margin:0;font-size:12px;line-height:1.7;color:${faint};">You're getting this because you're a member of ${gname}.<br><a href="${e(link)}" style="color:${faint};text-decoration:underline;">Open it in SplitEase</a>${refId ? ` &middot; Reference ${e(refId)}` : ""}</p>
  </div>
</td></tr></table>
<p style="margin:0 0 24px;font-size:12px;color:#7B8792;">SplitEase · Shared expenses, made simple.</p>
</td></tr></table></body></html>`;

  const text = [
    copy.title(data.group.name),
    "",
    `Hi ${first}, ${began.charAt(0).toLowerCase() + began.slice(1)} ${copy.endingText(by, when)}`,
    "",
    "Your full statement is attached as a PDF.",
    "",
    `Open it in SplitEase: ${link}`,
    refId ? `Reference ${refId}` : "",
    "SplitEase",
  ].join("\n").trim();

  return { subject, html, text, images: ["logo-light"] };
}
