import InfoPageLayout from "@/components/InfoPageLayout";

const sections = [
  {
    title: "What we use instead of tracking ads",
    body: [
      "SplitEase does not use cookies for third-party advertising or ad retargeting.",
      "What we do use is a small set of cookies and browser storage needed to keep you signed in and the app working correctly.",
    ],
  },
  {
    title: "Essential cookies and local storage",
    body: [
      "These keep your session authenticated, remember your theme preference, and preserve app state like an in-progress expense form. Without them, core features such as login and group access would not work.",
      "Because they're required for the app to function, essential cookies and local storage can't be turned off individually while you're using SplitEase.",
    ],
  },
  {
    title: "Functional preferences",
    body: [
      "A small number of settings, such as light/dark theme and notification preferences, are stored locally on your device so they persist between visits.",
      "These don't identify you to any third party - they only personalize how the app looks and behaves for you.",
    ],
  },
  {
    title: "Analytics",
    body: [
      "We may use limited, privacy-conscious analytics to understand which features are used and where the product breaks, so we can prioritize fixes.",
      "Analytics data is aggregated for product decisions and is not sold or shared with advertisers.",
    ],
  },
  {
    title: "Managing cookies in your browser",
    body: [
      "You can clear or block cookies at any time through your browser settings. Blocking essential cookies will likely sign you out or prevent parts of SplitEase from loading correctly.",
      "Clearing local storage will reset saved preferences like theme, but will not affect your account, groups, or expense data, which are stored on our servers.",
    ],
  },
];

export default function CookieSettingsPage() {
  return (
    <InfoPageLayout
      eyebrow="Cookies"
      title="Cookie Settings"
      description="What SplitEase stores in your browser, why it's there, and how to control it."
      effectiveDate="May 27, 2026"
      sections={sections}
      contactNote="Have a question about a specific cookie or storage key? Ask support."
      currentHref="/cookies"
    />
  );
}
