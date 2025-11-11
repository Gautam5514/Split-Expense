import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar"; // ✅ Import the Navbar
import { NotificationProvider } from "@/context/NotificationContext";
import Footer from "@/components/Footer";
export const metadata = {
  title: "SplitWise Travel",
  description: "Group expense splitter app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-black dark:text-white transition-colors">
        <AuthProvider>
          <NotificationProvider>
            <Navbar /> {/* ✅ Navbar on top of every page */}
            <Toaster position="top-right" />
            <main className="pt-[70px]"> {/* small padding for navbar height */}
              {children}
            </main>
            <Footer/>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
