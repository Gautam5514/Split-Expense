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
    default: "SplitEase: Group, Trip & Flat Expense Manager",
    template: "%s | SplitEase",
  },
  description:
    "Split trip costs, household bills and group expenses with SplitEase. Track who paid, calculate balances, scan receipts and settle shared expenses easily.",
  keywords: [
    "expense splitter", "split bills", "group expenses", "travel expense tracker",
    "bill splitting app", "trip expense manager", "flat expense manager",
    "roommate expense tracker", "travel expense splitter", "settle up", "shared expenses",
  ],
  authors: [{ name: "SplitEase" }],
  creator: "SplitEase",
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
    title: "SplitEase: Group, Trip & Flat Expense Manager",
    description:
      "Split trip costs, household bills and group expenses. Track who paid and settle balances without awkward calculations.",
    siteName: "SplitEase",
    images: [{ url: "/logo-icon.png", width: 512, height: 512, alt: "SplitEase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitEase: Group, Trip & Flat Expense Manager",
    description: "The simple way to split travel, roommate and group expenses.",
    images: ["/logo-icon.png"],
  },
  icons: {
    icon: [
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
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
        alternateName: "Split Ease",
        description: "A group, trip and shared household expense manager.",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "SplitEase",
        url: siteUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android, iOS",
        description: "SplitEase helps friends, travellers, roommates and groups track shared expenses, calculate balances and settle up.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Group expense splitting",
          "Trip expense management",
          "Roommate and flat expense tracking",
          "Receipt scanning",
          "Live balance tracking",
          "Flexible bill splits",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "SplitEase",
        url: siteUrl,
        logo: `${siteUrl}/logo-icon.png`,
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
