import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "Getting six friends into one group shouldn't take six messages",
  paragraphs: [
    "The usual way to add someone to a group app is typing out their email or username, one at a time, hoping you spelled it right. For a trip with ten people, that's ten chances to get it wrong.",
    "SplitEase generates a QR code and a shareable link for every group. Print the QR at a house party, drop the link in the trip WhatsApp thread, or hold up your phone at dinner - whoever scans or taps it lands straight in the group, already joined.",
    "No sign-up sheet, no manually adding each member, no \"wait, did you get my invite?\" follow-up texts.",
  ],
};

const steps = [
  { title: "Generate an invite", desc: "Every group gets its own QR code and link the moment it's created." },
  { title: "Share it your way", desc: "Print the QR, send the link, or just hold your phone up for someone to scan." },
  { title: "They land in the group", desc: "Scanning or tapping opens the group directly - no separate approval step needed." },
];

export default function QrInvitesPage() {
  return (
    <FeaturePageLayout
      tag="EASY INVITATIONS"
      tagColor="text-amber-400"
      glowBg="bg-amber-500/10"
      borderHover="hover:border-amber-500/25"
      title="QR & Link Invites"
      description="Every group gets its own QR code and invite link. Guests scan or tap to join instantly - no accounts to manually add, no onboarding sheet."
      image="/qrlink.webp"
      imageAlt="SplitEase QR code and link invite for joining a group"
      useCase={useCase}
      points={[
        "One-click join invite links for every group",
        "Scannable QR codes generated instantly",
        "Automatic redirect straight to the group landing page",
      ]}
      steps={steps}
      currentHref="/features/qr-invites"
    />
  );
}
