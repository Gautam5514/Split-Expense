import { escapeHtml } from "../middleware/validate.js";
import { emailImageAttachments } from "./groupReportService.js";

// Invitation email for people who don't have a SplitEase account yet.
// Same look as the settlement statement: dark header with the logo, cyan
// brand colour, Lucide icons as inline images (cid:) - no emoji.
//
// Every interpolated value is user-controlled (display name, group name,
// invitee address), so all of it is escaped: this email goes to arbitrary
// addresses from our domain and must not be usable to inject links or HTML.

const X = {
  ink: "#111111", body: "#3F3F46", mute: "#71717A", faint: "#A1A1AA", line: "#E4E4E7", wash: "#F4F4F5", page: "#FAFAFA",
  cyan: "#0891B2", cyanSoft: "#ECFEFF", night: "#0B0F17",
};
const FONT = `Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const BRAND_FONT = `'Josefin Sans',Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

const FEATURES = [
  ["feature-receipt", "Every expense in one place", "Add bills in seconds, split equally or your own way."],
  ["feature-swap", "Settle with the fewest payments", "SplitEase works out who pays whom, so nobody overpays."],
  ["feature-chart", "Always know where you stand", "Live balances for everyone in the group."],
  ["feature-chat", "Group chat built in", "Talk plans and payments right next to the numbers."],
];

const oneLine = (s, max = 80) => String(s ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * @param {object} p
 * @param {string} p.inviterName
 * @param {string} p.groupName
 * @param {string} p.joinLink
 * @param {string} p.email       the invitee
 * @param {Date}   [p.expiresAt] when the join link stops working
 * @returns {{subject: string, html: string, text: string, attachments: object[]}}
 */
export function buildInviteEmail({ inviterName, groupName, joinLink, email, expiresAt = null }) {
  const e = escapeHtml;
  const inviter = oneLine(inviterName) || "A friend";
  const group = oneLine(groupName, 120);
  const images = ["logo", ...FEATURES.map((f) => f[0])];
  const img = (name, size, alt = "") =>
    `<img src="cid:se-${name}" width="${size}" height="${size}" alt="${alt}" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;">`;
  const expiry = expiresAt && !Number.isNaN(new Date(expiresAt).getTime()) ? fmtDate(expiresAt) : "";

  const subject = `${inviter} invited you to join ${group} on SplitEase`;
  const preheader = `${inviter} wants to split expenses with you in ${group}. Join in one tap.`;

  const features = FEATURES.map(([icon, title, desc]) => `
      <tr><td width="44" valign="top" style="padding:8px 0;">${img(icon, 32)}</td>
        <td valign="top" style="padding:8px 0 8px 4px;">
          <div style="font:600 14px ${FONT};color:${X.ink};">${title}</div>
          <div style="font:400 13px/1.5 ${FONT};color:${X.mute};margin-top:2px;">${desc}</div>
        </td></tr>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${X.wash};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${X.wash};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid ${X.line};">
    <tr><td style="background:${X.night};padding:22px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="44" valign="middle">${img("logo", 40, "SplitEase")}</td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font:700 21px/1.1 ${BRAND_FONT};color:#FFFFFF;">SplitEase</div>
          <div style="font:600 10px ${FONT};color:#67E8F9;letter-spacing:1.6px;margin-top:4px;">SPLIT EXPENSES. STAY FRIENDS.</div></td>
      </tr></table></td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${X.cyan};background-image:linear-gradient(90deg,#22D3EE,#A78BFA);">&nbsp;</td></tr>

    <tr><td style="padding:32px 28px 8px;">
      <div style="font:600 11px ${FONT};color:${X.cyan};letter-spacing:1.4px;text-transform:uppercase;">You're invited</div>
      <h1 style="margin:8px 0 10px;font:800 24px/1.3 ${FONT};color:${X.ink};">Join ${e(group)} on SplitEase</h1>
      <p style="margin:0;font:400 15px/1.6 ${FONT};color:${X.body};"><strong style="color:${X.ink};">${e(inviter)}</strong> invited you to share and split expenses in this group. Join to see what's been added and keep track of who owes what.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 6px;background:${X.page};border:1px solid ${X.line};border-radius:14px;"><tr><td style="padding:16px 18px;">
        <div style="font:600 10px ${FONT};color:${X.mute};letter-spacing:1px;text-transform:uppercase;">Group</div>
        <div style="font:700 18px/1.35 ${FONT};color:${X.ink};margin-top:3px;">${e(group)}</div>
        <div style="font:400 13px ${FONT};color:${X.mute};margin-top:2px;">Invited by ${e(inviter)}</div>
      </td></tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td align="center">
        <a href="${e(joinLink)}" style="display:inline-block;background:${X.cyan};color:#FFFFFF;font:700 15px ${FONT};text-decoration:none;padding:14px 38px;border-radius:12px;">Join ${e(group)}</a>
      </td></tr></table>
      <p style="margin:12px 0 0;text-align:center;font:400 12px/1.6 ${FONT};color:${X.mute};">Free to use. Create your account and you'll be added to the group automatically.${expiry ? `<br>This invite link works until ${e(expiry)}.` : ""}</p>

      <div style="border-top:1px solid ${X.line};margin:28px 0 8px;"></div>
      <div style="font:700 15px ${FONT};color:${X.ink};margin:18px 0 6px;">Why groups use SplitEase</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${features}</table>

      <p style="margin:20px 0 6px;font:400 12px/1.6 ${FONT};color:${X.mute};">Button not working? Copy this link into your browser:<br>
        <a href="${e(joinLink)}" style="color:${X.cyan};text-decoration:none;word-break:break-all;">${e(joinLink)}</a></p>
    </td></tr>

    <tr><td style="padding:18px 28px 22px;border-top:1px solid ${X.line};background:${X.page};">
      <div style="font:700 13px ${BRAND_FONT};color:${X.cyan};">SplitEase</div>
      <div style="font:400 11px/1.6 ${FONT};color:${X.faint};margin-top:4px;">This invitation was sent to ${e(email)} by ${e(inviter)}. If you weren't expecting it, you can ignore this email and nothing will happen.</div>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const text = [
    `${inviter} invited you to join "${group}" on SplitEase.`,
    "",
    "SplitEase keeps track of shared expenses and works out who owes whom.",
    "",
    `Join the group: ${joinLink}`,
    expiry ? `This invite link works until ${expiry}.` : "",
    "",
    `This invitation was sent to ${email} by ${inviter}. If you weren't expecting it, you can ignore this email.`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").trim();

  return { subject, html, text, attachments: emailImageAttachments(images) };
}
