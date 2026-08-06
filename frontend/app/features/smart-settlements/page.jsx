import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "Balances that update themselves",
  paragraphs: [
    "The moment someone adds an expense, every member's balance recalculates instantly - no refreshing, no one running mental math at the table.",
    "Smart Settlements also works out the minimum number of transfers needed to clear a group, instead of everyone paying everyone back individually. Six people can settle a trip in two or three payments instead of fifteen.",
    "When it's time to actually pay - by cash or a bank/UPI transfer you make yourselves - one side files a settlement claim and the other confirms it before the balance moves, so no one can mark a debt paid unilaterally. Direct in-app UPI payment is on our roadmap.",
  ],
};

const steps = [
  { title: "Add an expense", desc: "Log who paid and how it's split - equally, by percentage, shares, or exact amounts." },
  { title: "Balances update live", desc: "Every member's net position recalculates instantly across every device in the group." },
  { title: "Settle with confirmation", desc: "SplitEase works out the fewest transfers needed; the payer files a claim and the payee confirms it before the balance changes." },
];

export default function SmartSettlementsPage() {
  return (
    <FeaturePageLayout
      tag="REAL-TIME BALANCES"
      tagColor="text-cyan-400"
      glowBg="bg-cyan-500/10"
      borderHover="hover:border-cyan-500/25"
      title="Smart Settlements"
      description="Live balances that update the instant an expense is added, plus minimum-transfer settlements so your group clears up in the fewest payments possible."
      image="/live_balance_tracking.webp"
      imageAlt="SplitEase live balance dashboard showing group settlements"
      useCase={useCase}
      points={[
        "Real-time synchronization across every device",
        "Instant net-debt calculations for the whole group",
        "Minimum-transfer settlements with two-party confirmation",
      ]}
      steps={steps}
      currentHref="/features/smart-settlements"
    />
  );
}
