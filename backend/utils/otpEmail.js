import fs from 'node:fs';
import { escapeHtml } from '../middleware/validate.js';

// A single plain-text digit sequence is easy to select and parse. Gmail owns
// its native Copy code shortcut; HTML email cannot force clipboard actions.
let logo;
try { logo = fs.readFileSync(new URL('../assets/brand/logo-light-160.png', import.meta.url)); } catch { /* Wordmark still identifies the sender. */ }

export const authEmailLogoAttachments = () => logo ? [{ filename: 'splitease-logo.png', content: logo, contentType: 'image/png', cid: 'splitease-otp-logo' }] : [];

export function buildOtpEmail({ name, otp, purpose = 'signup' }) {
  const code = String(otp);
  if (!/^\d{6}$/.test(code)) throw new Error('Expected a six-digit verification code');
  const login = purpose === 'login';
  const title = login ? 'Your sign-in code' : 'Verify your email';
  const action = login ? 'sign in to SplitEase' : 'verify your email and finish signing up';
  const subject = `${code} is your SplitEase ${login ? 'sign-in' : 'verification'} code`;
  const text = [
    `Your SplitEase ${login ? 'sign-in' : 'verification'} code: ${code}`,
    '',
    `Hi ${name || 'there'},`,
    `Enter this code to ${action}. It expires in 10 minutes.`,
    '',
    'Do not share this code with anyone.',
    `If you did not request this ${login ? 'sign-in' : 'verification'}, you can ignore this email.`,
    'SplitEase',
  ].join('\n');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title>
<style>@media(max-width:480px){.email-padding{padding:24px!important}.otp-code{font-size:36px!important;letter-spacing:5px!important}}</style></head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#17212B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#FFFFFF;">
<tr><td class="email-padding" style="padding:30px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    ${logo ? '<td width="44" style="padding-right:10px;"><img src="cid:splitease-otp-logo" width="36" height="36" alt="" style="display:block;border:0;"></td>' : ''}
    <td style="font-size:21px;font-weight:700;letter-spacing:-.5px;color:#17212B;">SplitEase</td>
  </tr></table>
  <h1 style="margin:28px 0 10px;font-size:25px;line-height:1.3;font-weight:700;color:#17212B;">${title}</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#52606D;">Hi ${escapeHtml(name || 'there')}, enter this code to ${action}.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;"><tr><td align="left" style="padding:8px 0;">
    <div style="font-size:11px;font-weight:600;letter-spacing:1.3px;color:#687582;margin-bottom:9px;">VERIFICATION CODE</div>
    <div class="otp-code" dir="ltr" style="font-family:Consolas,'Courier New',monospace;font-size:40px;line-height:1.3;font-weight:700;letter-spacing:6px;color:#17212B;white-space:nowrap;user-select:all;-webkit-user-select:all;">${code}</div>
  </td></tr></table>
  <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#52606D;">Expires in <strong style="color:#17212B;">10 minutes</strong>. Select the code to copy it.</p>
  <div style="margin-top:26px;padding-top:8px;">
    <p style="margin:0;font-size:12px;line-height:1.7;color:#687582;">Do not share this code with anyone.<br>If you didn't request this ${login ? 'sign-in' : 'verification'}, you can ignore this email.</p>
  </div>
</td></tr></table>
<p style="margin:0 0 24px;font-size:12px;color:#7B8792;">SplitEase · Shared expenses, made simple.</p>
</td></tr></table></body></html>`;
  return { subject, html, text, ...(logo ? { attachments: authEmailLogoAttachments() } : {}) };
}
