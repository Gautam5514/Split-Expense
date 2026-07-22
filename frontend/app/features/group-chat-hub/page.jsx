import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "Money talk, without leaving the conversation",
  paragraphs: [
    "Every group already has a chat somewhere - the problem is the expenses live in a completely different app, so nothing lines up and nobody wants to be the one bringing up money.",
    "SplitEase puts group and direct chat right next to the balances. Share a receipt photo, agree on how to split it, and log the settlement, all inside the same thread the conversation was already happening in.",
    "When someone pays you back, it shows up as a message in the thread too - so \"I already paid you\" never turns into a he-said-she-said.",
  ],
};

const steps = [
  { title: "Chat in the group", desc: "Real-time group and direct messaging, built right alongside your expenses." },
  { title: "Attach as you go", desc: "Drop a receipt photo or reference an expense directly inside the conversation." },
  { title: "Settlements show up too", desc: "Payments and settle-ups post as messages, so the thread is the full record." },
];

export default function GroupChatHubPage() {
  return (
    <FeaturePageLayout
      tag="GROUP CHAT"
      tagColor="text-violet-400"
      glowBg="bg-violet-500/10"
      borderHover="hover:border-violet-500/25"
      title="Group Chat Hub"
      description="Real-time chat built into every group, so discussing a bill, sharing a receipt, and logging a settlement all happen in one thread instead of three different apps."
      image="/groupchat.webp"
      imageAlt="SplitEase group chat with expense discussion and settlements"
      useCase={useCase}
      points={[
        "Real-time group and direct messaging",
        "Expense and receipt attachments in chat",
        "Settlements and payment alerts logged in the thread",
      ]}
      steps={steps}
      currentHref="/features/group-chat-hub"
    />
  );
}
