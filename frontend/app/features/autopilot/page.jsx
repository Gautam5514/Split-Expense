import AutopilotFeatureClient from "@/components/features/AutopilotFeatureClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export const metadata = {
  title: "Autopilot — Your AI assistant for shared expenses | SplitEase",
  description:
    "Tell SplitEase Autopilot what you need in plain English or Hinglish. It plans groups, people, bills and budgets, shows the exact split, and changes nothing until you approve.",
  keywords: ["SplitEase Autopilot", "AI expense assistant", "split bills with AI", "Hinglish expense app", "AI agent for expenses"],
  alternates: { canonical: `${siteUrl}/features/autopilot` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/features/autopilot`,
    title: "SplitEase Autopilot — ask, review, approve",
    description: "An AI assistant that plans your group expenses and waits for your yes.",
    siteName: "SplitEase",
    images: [{ url: "/logo-icon.png", width: 512, height: 512, alt: "SplitEase" }],
  },
};

export default function AutopilotFeaturePage() {
  return <AutopilotFeatureClient />;
}
