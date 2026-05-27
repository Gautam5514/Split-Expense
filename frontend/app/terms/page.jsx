import { FileText } from "lucide-react";
import InfoPageLayout from "@/components/InfoPageLayout";

const sections = [
  {
    title: "Using SplitEase",
    body: [
      "You are responsible for keeping your account secure and for making sure the expenses, payments, and group details you enter are accurate.",
      "SplitEase helps track and calculate shared balances, but it does not process bank transfers or guarantee that another person will repay you.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not use SplitEase to upload harmful content, impersonate others, access groups without permission, abuse invitations, or interfere with app security.",
      "We may restrict access to accounts or content that appear fraudulent, abusive, unlawful, or harmful to other users.",
    ],
  },
  {
    title: "Content and records",
    body: [
      "You retain responsibility for the expense records, messages, receipts, and profile details you add to the service.",
      "By using the app, you allow SplitEase to store and display that content as needed to provide group expense, chat, notification, and support features.",
    ],
  },
  {
    title: "Service changes",
    body: [
      "Features may change over time as we improve the product. We may update these terms when functionality, legal requirements, or operating practices change.",
      "Continued use of SplitEase after updated terms are posted means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <InfoPageLayout
      eyebrow="Legal"
      title="Terms and Conditions"
      description="The rules for using SplitEase, including account responsibility, acceptable use, and how shared expense records are handled."
      icon={FileText}
      sections={sections}
      asideTitle="Terms summary"
      asideItems={[
        { label: "Last updated", value: "May 27, 2026" },
        { label: "Payments", value: "SplitEase tracks balances but does not process external repayments." },
        { label: "Questions", value: "Contact support if any term is unclear." },
      ]}
    />
  );
}
