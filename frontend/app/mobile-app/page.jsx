import MobileAppPageClient from "@/components/mobile-app/MobileAppPageClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kunal.splitapp";

export const metadata = {
  title: "SplitEase Mobile App — Split Expenses on Android | Free Download",
  description:
    "Get the SplitEase Android app: groups, AI-assisted expense splitting, receipt attachments, group chat, and smart settlements, free with no paywall. iOS coming soon.",
  keywords: [
    "SplitEase app",
    "SplitEase Android app",
    "download SplitEase",
    "expense splitting app",
    "split bills app",
    "group expense app",
  ],
  alternates: { canonical: `${siteUrl}/mobile-app` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/mobile-app`,
    title: "SplitEase Mobile App — Split Expenses on Android",
    description:
      "Groups, AI-assisted splitting, receipt attachments, chat and settlements - free on Android, no paywall.",
    siteName: "SplitEase",
    images: [{ url: "/logo-concept-app.svg", width: 512, height: 512, alt: "SplitEase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitEase Mobile App — Split Expenses on Android",
    description: "Groups, AI-assisted splitting, receipt attachments, chat and settlements - free on Android.",
  },
};

export default function MobileAppPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/mobile-app#app`,
        name: "SplitEase",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Android 8.0+",
        url: `${siteUrl}/mobile-app`,
        installUrl: PLAY_STORE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "SplitEase", url: siteUrl },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/mobile-app#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Mobile App", item: `${siteUrl}/mobile-app` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MobileAppPageClient />
    </>
  );
}
