import { HeroSection } from "@/features/landing/components/hero-section";
import { PhilosophySection } from "@/features/landing/components/philosophy-section";
import { FeaturesSection } from "@/features/landing/components/features-section";
import { SafetyDisclaimer } from "@/features/landing/components/safety-disclaimer";
import { CtaSection } from "@/features/landing/components/cta-section";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <PhilosophySection />
      <FeaturesSection />
      <SafetyDisclaimer />
      <CtaSection />
    </>
  );
}
