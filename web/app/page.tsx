import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { MobileSection } from "@/components/landing/mobile-section";
import { CtaFooter } from "@/components/landing/cta-footer";

export const metadata: Metadata = {
  title: "StayEase — Hotel Management Platform",
  description:
    "The complete platform for hotel owners and administrators. Manage properties, reservations, analytics, and guests in one powerful, real-time dashboard.",
};

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="overflow-x-hidden">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <MobileSection />
        <CtaFooter />
      </main>
    </>
  );
}
