import InfoPageLayout from "@/components/InfoPageLayout";

const sections = [
  {
    title: "Who this covers",
    body: [
      "SplitEase operates the SplitEase app, website, and related services. These legal pages apply to anyone who creates an account, joins a group, or otherwise uses SplitEase.",
      "Where a specific policy (Privacy, Terms, Security, Cookies) goes into more detail than this overview, that policy governs.",
    ],
  },
  {
    title: "The documents that apply to you",
    body: [
      "Privacy Policy - what account and expense data we collect, how it's used, and the controls you have over it.",
      "Terms of Service - the rules for using SplitEase, including account responsibility and acceptable use.",
      "Security Center - how your data is protected, from encryption to access controls to incident response.",
      "Cookie Settings - which cookies and local storage SplitEase uses, and how to manage them.",
    ],
  },
  {
    title: "Company details",
    body: [
      "Formal registered-entity details (legal name, registration number, and registered address) will be published here once verified and finalized. Until then, treat SplitEase as the operating brand name, not a confirmed registered legal entity.",
    ],
  },
  {
    title: "Grievance and legal contact",
    body: [
      "For grievances, legal notices, or requests related to your account data, contact our support team - inquiries are routed to the right team internally, including legal and security where needed.",
      "We aim to acknowledge legal and grievance requests within a reasonable time and resolve them as quickly as the matter allows.",
    ],
  },
];

export default function LegalOverviewPage() {
  return (
    <InfoPageLayout
      eyebrow="Legal"
      title="Legal Overview"
      description="A short map of every legal document that governs SplitEase, and where to go for the specifics."
      effectiveDate="May 27, 2026"
      sections={sections}
      contactNote="Looking for something specific, like a data request or a legal notice? Get in touch."
      currentHref="/legal"
    />
  );
}
