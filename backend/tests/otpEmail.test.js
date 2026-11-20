import { buildOtpEmail } from '../utils/otpEmail.js';

describe('OTP emails', () => {
  test.each(['signup', 'login'])('%s has a contiguous selectable code and plain-text alternative', (purpose) => {
    const mail = buildOtpEmail({ name: 'Asha', otp: '012345', purpose });
    expect(mail.subject).toMatch(/^012345 is your SplitEase/);
    expect(mail.text.split('\n')[0]).toContain('code: 012345');
    expect(mail.html.match(/012345/g)).toHaveLength(1);
    expect(mail.html).toContain('>012345</div>');
    expect(mail.html).toContain('user-select:all');
    expect(mail.html).toContain('10 minutes');
    expect(mail.html).toContain('background:#FFFFFF');
    expect(mail.html).not.toMatch(/<script|onclick|navigator\.clipboard|href=["'].*012345/i);
    expect(mail.attachments.some((item) => item.cid === 'splitease-otp-logo' && item.content.length > 0)).toBe(true);
  });
  test('escapes names and identifies the requested action', () => {
    const signup = buildOtpEmail({ name: '<img src=x onerror=alert(1)>', otp: '123456' });
    expect(signup.html).toContain('&lt;img');
    expect(signup.html).not.toContain('<img src=x');
    expect(signup.html).toContain('finish signing up');
    const login = buildOtpEmail({ name: 'Asha', otp: '123456', purpose: 'login' });
    expect(login.html).toContain('sign in to SplitEase');
    expect(login.html).not.toContain('finish signing up');
  });
  test.each(['12345', '1234567', '<b>123456</b>', undefined])('rejects malformed codes: %s', (otp) => {
    expect(() => buildOtpEmail({ otp })).toThrow('six-digit');
  });
});
