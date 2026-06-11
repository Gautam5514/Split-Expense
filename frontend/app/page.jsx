"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HeroSection from "@/components/home/HeroSection";
import LogoSlider from "@/components/LogoSlider";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import DeviceSlideShowcase from "@/components/home/DeviceSlideShowcase";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import Footer from "@/components/Footer";
import ScrollProgressAndTop from "@/components/ScrollProgressAndTop";
import { captureReferralFromLocation } from "@/lib/referral";

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
      <ScrollProgressAndTop />
      <HeroSection />
      <LogoSlider />
      <ShowcaseSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DeviceSlideShowcase />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
