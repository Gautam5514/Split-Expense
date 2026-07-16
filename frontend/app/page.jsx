"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { captureReferralFromLocation } from "@/lib/referral";

// Above-the-fold: load eagerly so the hero paints immediately.
import HeroSection from "@/components/home/HeroSection";
import LogoSlider from "@/components/LogoSlider";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgressAndTop from "@/components/ScrollProgressAndTop";
import LazySection from "@/components/LazySection";
import SearchIntentSection from "@/components/home/SearchIntentSection";

// Below-the-fold: each is its own code-split chunk that is only downloaded
// and mounted when the user scrolls near it (see <LazySection>). This keeps
// the initial JS bundle small so the page becomes interactive fast.
const ShowcaseSection = dynamic(() => import("@/components/ShowcaseSection"));
const IntelligenceSection = dynamic(() => import("@/components/home/IntelligenceSection"));
const HowItWorksSection = dynamic(() => import("@/components/home/HowItWorksSection"));
const FeatureMindMap = dynamic(() => import("@/components/home/FeatureMindMap"));
const FeaturesSection = dynamic(() => import("@/components/home/FeaturesSection"));
const DeviceSlideShowcase = dynamic(() => import("@/components/home/DeviceSlideShowcase"));
const TestimonialsSection = dynamic(() => import("@/components/home/TestimonialsSection"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function HomePage() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace("/users");
    }
  }, [token, router]);

  // Capture ?ref=CODE for attribution at first-ever signup.
  useEffect(() => {
    captureReferralFromLocation();
  }, []);

  if (token) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      <SmoothScroll />
      <ScrollProgressAndTop />

      {/* Above the fold — eager */}
      <HeroSection />
      <LogoSlider />

      {/* Below the fold — chunked + mounted on demand */}
      <LazySection minHeight="800vh">
        <ShowcaseSection />
      </LazySection>
      <LazySection minHeight="100vh">
        <IntelligenceSection />
      </LazySection>
      <LazySection minHeight="100vh">
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight="100vh">
        <FeatureMindMap />
      </LazySection>
      <LazySection minHeight="100vh">
        <FeaturesSection />
      </LazySection>
      <LazySection minHeight="100vh">
        <DeviceSlideShowcase />
      </LazySection>
      <LazySection minHeight="100vh">
        <TestimonialsSection />
      </LazySection>
      <SearchIntentSection />
      <LazySection minHeight="40vh">
        <Footer />
      </LazySection>
    </div>
  );
}
