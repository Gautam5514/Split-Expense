import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import MainWrapper from "@/components/MainWrapper";
import AppFooter from "@/components/AppFooter";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "SplitEase - Group Expense Splitter",
  description:
    "AI-powered group expense splitter. Split bills with friends, track shared costs, scan receipts with OCR, and settle up in one tap.",
  keywords: [
    "expense splitter", "split bills", "group expenses", "travel expense tracker",
    "bill splitting app", "splitwise alternative", "settle up", "shared expenses",
  ],
  manifest: "/manifest.json",
  applicationName: "SplitEase",
  appleWebApp: {
    capable: true,
    title: "SplitEase",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    title: "SplitEase - Group Expense Splitter",
    description:
      "Split bills, track shared costs, and settle up instantly. Powered by AI.",
    siteName: "SplitEase",
    images: [{ url: "/logo-icon.png", width: 512, height: 512, alt: "SplitEase" }],
  },
  twitter: {
    card: "summary",
    title: "SplitEase - Group Expense Splitter",
    description: "Split bills, track shared costs, and settle up instantly.",
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
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* theme-color matches manifest.json theme_color exactly */}
        <meta name="theme-color" content="#0891B2" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Inline script to apply dark/light class before first paint - prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Navbar />
              <Toaster
                position="top-right"
                toastOptions={{ className: "glass-toast-premium" }}
              />
              <MainWrapper>
                {children}
              </MainWrapper>
              <AppFooter />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
