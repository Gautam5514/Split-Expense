import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "“What do I actually owe?”, answered in one line",
  paragraphs: [
    "Group trips rack up dozens of small expenses fast - cabs, snacks, one person covering the hotel deposit. By day three, nobody actually knows their real balance without opening a calculator.",
    "The AI Expense Assistant lives inside your group and answers in plain language: who owes who, how a bill should be split, or what happens if you settle now versus at the end of the trip.",
    "It's not a chatbot bolted on the side - it reads your group's real expenses and balances, so every answer reflects what actually happened, not a guess.",
  ],
};

const steps = [
  { title: "Ask a question", desc: "Type something like “how much do I owe Raj?” or “split this ₹3,200 dinner three ways.”" },
  { title: "AI reads the group", desc: "It pulls real balances, past expenses, and members - no manual context needed." },
  { title: "Get a straight answer", desc: "A clear breakdown or split suggestion, with a tap-to-settle option when you're ready." },
];

export default function AIExpenseSplitterPage() {
  return (
    <FeaturePageLayout
      tag="LLM INSIGHTS"
      tagColor="text-pink-400"
      glowBg="bg-pink-500/10"
      borderHover="hover:border-pink-500/25"
      title="AI Expense Splitter"
      description="An embedded assistant that understands your group's spending - ask it anything, and it answers using your group's real expenses and balances."
      image="/ai_expense.webp"
      imageAlt="SplitEase AI expense assistant answering a spending question"
      useCase={useCase}
      points={[
        "Ask custom spending queries in plain language",
        "Generates visual net-debt breakdowns",
        "Suggests fair splits and settlements automatically",
      ]}
      steps={steps}
      currentHref="/features/ai-expense-splitter"
    />
  );
}
