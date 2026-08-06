import InfoPageLayout from "@/components/InfoPageLayout";

const sections = [
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
