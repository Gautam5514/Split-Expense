import InfoPageLayout from "@/components/InfoPageLayout";

const OpenSSFBadge = () => (
  <a
    href="https://www.bestpractices.dev/projects/14650"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Verify Split-Expense on OpenSSF Best Practices"
    className="group mt-1 inline-flex w-fit items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-all duration-300 hover:border-cyan-400/30 hover:bg-cyan-400/[0.05]"
  >
    <img
      src="https://www.bestpractices.dev/projects/14650/badge"
      alt="OpenSSF Best Practices badge status for Split-Expense"
      width="130"
      height="26"
      loading="lazy"
      className="h-[26px] w-auto"
    />
    <span className="text-xs leading-tight text-white/50 transition-colors group-hover:text-white/70">
      Live status, verified by OpenSSF - click to view our public checklist
    </span>
  </a>
);

const sections = [
  {
    title: "Testing & verification",
    body: [
      "We run our backend against the OWASP Top 10 categories (access control, injection, SSRF, cryptographic handling, security misconfiguration, and authentication) and remediate what we find - most recently a September 2026 review that fixed a server-side request forgery gap in receipt/image handling, tightened CORS to an explicit origin allow-list, hardened real-time chat authorization, and increased invite-link entropy.",
      "This is our own internal testing, not a third-party audit - we're not claiming a certification that doesn't exist. What is independently verifiable is our OpenSSF Best Practices status below: it's a public, self-reported checklist hosted by the Open Source Security Foundation, and the badge always reflects our current, live status - not a fixed claim.",
      <OpenSSFBadge key="openssf-badge" />,
    ],
  },
  {
    title: "Encryption",
    body: [
      "Data is encrypted in transit using TLS between your device and SplitEase's servers.",
      "Sensitive account and expense data is encrypted at rest, and access to production data stores is restricted to systems and personnel that need it to operate the service.",
    ],
  },
  {
    title: "Access control",
    body: [
      "Internal access to user data is limited to authenticated staff on a need-to-know basis, and access is logged.",
      "Your account is protected by authenticated sessions, and you can review and revoke active sessions from account settings.",
    ],
  },
  {
    title: "Infrastructure and monitoring",
    body: [
      "SplitEase runs on reputable cloud infrastructure providers with their own physical and network security controls.",
      "We monitor core services for abnormal activity and errors so issues can be caught and addressed quickly.",
    ],
  },
  {
    title: "Compliance posture",
    body: [
      "Our security practices are inspired by widely recognized frameworks and standards, including OWASP guidance and general principles found in GDPR, SOC 2, ISO/IEC 27001, ISO/IEC 22301, and PCI DSS.",
      "This describes the standards we design towards - it is not a claim of formal certification or audit under any of these frameworks. We do not display certification badges or seals for frameworks we have not been formally certified or audited under, and we will update this page with certificate references if and when that changes.",
    ],
  },
  {
    title: "Incident response",
    body: [
      "If a security incident affects your account or data, we will investigate promptly and notify affected users where required by law or where the impact is material.",
      "We continuously review and patch dependencies and infrastructure to reduce exposure to known vulnerabilities.",
    ],
  },
  {
    title: "Responsible disclosure",
    body: [
      "If you believe you've found a security vulnerability in SplitEase, please report it to our support team with enough detail to reproduce the issue.",
      "Please avoid accessing, modifying, or deleting other users' data while testing, and give us a reasonable time to investigate and respond before disclosing publicly.",
    ],
  },
];

export default function SecurityCenterPage() {
  return (
    <InfoPageLayout
      eyebrow="Security"
      title="Security Center"
      description="How SplitEase protects your account, your groups, and every expense and message inside them."
      effectiveDate="May 27, 2026"
      sections={sections}
      contactNote="Found a vulnerability, or want details on a specific control? We want to hear from you."
      currentHref="/security"
    />
  );
}
