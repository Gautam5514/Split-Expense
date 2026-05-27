import { ShieldCheck } from "lucide-react";
import InfoPageLayout from "@/components/InfoPageLayout";

const sections = [
  {
    title: "Information we collect",
    body: [
      "SplitEase collects the account details you provide, such as your name, email address, profile information, group memberships, expenses, balances, messages, and uploaded receipts.",
      "We also collect basic technical information needed to keep the service reliable, including device type, authentication status, and usage events related to app features.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use your information to create groups, calculate balances, send invitations, show notifications, support chat features, and help you settle shared expenses.",
      "We may use aggregated product data to improve reliability, detect abuse, and understand which features need refinement.",
    ],
  },
  {
    title: "Sharing and visibility",
    body: [
      "Group members can see expenses, balances, members, and messages that belong to groups they are part of.",
      "We do not sell your personal information. We only share data with service providers that help operate core app features, such as authentication, email delivery, hosting, and storage.",
    ],
  },
  {
    title: "Data retention and control",
    body: [
      "Your data is kept while your account is active or as needed to provide the service. You can update profile details and remove content where the app provides those controls.",
      "Deleting your account may remove profile data, groups you created, expenses, messages, and related records, subject to technical and legal retention requirements.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      description="A clear summary of what SplitEase collects, why it is used, and how your expense data is protected."
      icon={ShieldCheck}
      sections={sections}
      asideTitle="Privacy summary"
      asideItems={[
        { label: "Last updated", value: "May 27, 2026" },
        { label: "Data purpose", value: "Account access, expense splitting, groups, chat, invitations, and support." },
        { label: "Support email", value: "support@splitease.app" },
      ]}
    />
  );
}
