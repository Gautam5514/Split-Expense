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
    title: "Termination",
    body: [
      "You may stop using SplitEase and delete your account at any time from account settings.",
      "We may suspend or terminate access for accounts that violate these terms, including abuse of other users or misuse of shared group data.",
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
      title="Terms of Service"
      description="The rules for using SplitEase, including account responsibility, acceptable use, and how shared expense records are handled."
      effectiveDate="May 27, 2026"
      sections={sections}
      contactNote="Not sure how a term applies to your group? We're happy to clarify."
      currentHref="/terms"
    />
  );
}
