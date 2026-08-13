import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import MainWrapper from "@/components/MainWrapper";
import AppFooter from "@/components/AppFooter";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import CustomCursor from "@/components/CustomCursor";
import InstallPrompt from "@/components/InstallPrompt";
import GlassThemeGate from "@/components/GlassThemeGate";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online"),
  title: {
    default: "SplitEase: Group, Trip & Flat Expense Manager | Founded by Gautam Pandit",
    template: "%s | SplitEase",
  },
  description:
    "Split trip costs, household bills and group expenses with SplitEase (split.elitecrew.online). Created by Gautam Pandit to simplify shared finances with zero paywalls, receipt OCR, and AI settlements.",
  keywords: [
    "SplitEase", "split.elitecrew.online", "SplitEase app",
    "Gautam Pandit", "Gautam Pandit SplitEase", "Gautam Pandit founder", "who built SplitEase", "who created SplitEase", "SplitEase developer",
    "expense splitter", "split bills", "group expenses", "travel expense tracker",
    "bill splitting app", "trip expense manager", "flat expense manager",
    "roommate expense tracker", "travel expense splitter", "settle up", "shared expenses", "splitwise alternative",
  ],
  authors: [{ name: "Gautam Pandit", url: "https://split.elitecrew.online/about" }, { name: "SplitEase" }],
  creator: "Gautam Pandit",
  publisher: "SplitEase",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.json",
  applicationName: "SplitEase",
  appleWebApp: {
    capable: true,
    title: "SplitEase",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "SplitEase: Group, Trip & Flat Expense Manager | Gautam Pandit",
    description:
      "Split trip costs, household bills and group expenses. Created by Gautam Pandit to simplify shared finances with zero paywalls.",
    siteName: "SplitEase",
    images: [{ url: "/logo-concept-a.svg", width: 512, height: 512, alt: "SplitEase by Gautam Pandit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitEase: Group, Trip & Flat Expense Manager | Gautam Pandit",
    description: "The simple way to split travel, roommate and group expenses, created by Gautam Pandit.",
    images: ["/logo-concept-a.svg"],
    creator: "@Gautamp5514",
  },
  icons: {
    icon: [
      { url: "/logo-concept-a.svg", type: "image/svg+xml" },
    ],
    apple: "/logo-concept-a.svg",
  },
};

export default function RootLayout({ children }) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "SplitEase",
        alternateName: ["Split Ease", "SplitEase App", "split.elitecrew.online"],
        description: "Group, trip and shared household expense manager built by Gautam Pandit.",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "SplitEase",
        url: siteUrl,
        logo: `${siteUrl}/logo-concept-a.svg`,
        founder: { "@id": `${siteUrl}/#gautam-pandit` },
        foundingDate: "2026",
        sameAs: [
          "https://github.com/Gautam5514",
          "https://x.com/Gautamp5514",
          "https://www.linkedin.com/in/gautam-pandit-4b185224b/",
          "https://www.instagram.com/gautamp5514/",
        ],
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#gautam-pandit`,
        name: "Gautam Pandit",
        alternateName: ["Gautam Pandit SplitEase", "Gautam Pandit Founder"],
        jobTitle: "Founder & Lead Software Engineer",
        worksFor: { "@id": `${siteUrl}/#organization` },
        url: `${siteUrl}/about`,
        image: `${siteUrl}/blog/gautam-pandit-portrait.png`,
        description: "Gautam Pandit is the founder, creator, and lead developer of SplitEase (split.elitecrew.online) — a smart group expense-splitting platform.",
        sameAs: [
          "https://github.com/Gautam5514",
          "https://x.com/Gautamp5514",
          "https://www.linkedin.com/in/gautam-pandit-4b185224b/",
          "https://www.instagram.com/gautamp5514/",
        ],
        knowsAbout: [
          "Software Engineering",
          "Expense Splitting Algorithms",
          "Fintech Applications",
          "System Architecture",
          "SplitEase",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "SplitEase",
        url: siteUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android, iOS",
        author: { "@id": `${siteUrl}/#gautam-pandit` },
        description: "SplitEase helps friends, travellers, roommates and groups track shared expenses, calculate balances, scan receipts with OCR, and settle up.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Group expense splitting",
          "Trip expense management",
          "Roommate and flat expense tracking",
          "AI OCR Receipt scanning",
          "Live balance tracking",
          "AI Financial Assistant",
          "Minimum payment debt simplification",
        ],
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* theme-color matches manifest.json theme_color exactly */}
        <meta name="theme-color" content="#0891B2" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Inline script to apply dark/light class before first paint - prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <GlassThemeGate />
                <Navbar />
                <Toaster
                  position="top-right"
                  gutter={10}
                  toastOptions={{
                    // Per-type classes are applied per call in lib/toast.js so
                    // custom toasts (the notification popup) stay unstyled.
                    duration: 3500,
                    success: {
                      duration: 3000,
                      iconTheme: { primary: "#10B981", secondary: "#FFFFFF" },
                    },
                    error: {
                      duration: 4500,
                      iconTheme: { primary: "#E5484D", secondary: "#FFFFFF" },
                    },
                    loading: {
                      iconTheme: { primary: "#0891B2", secondary: "#E4E9F0" },
                    },
                  }}
                />
                <MainWrapper>
                  {children}
                </MainWrapper>
                <AppFooter />
                <CustomCursor />
                <InstallPrompt />
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
