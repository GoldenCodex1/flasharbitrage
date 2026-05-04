import HeroSection from "@/components/homepage/HeroSection";
import HowItWorks from "@/components/homepage/HowItWorks";
import WhyChoose from "@/components/homepage/WhyChoose";
import TechnologySection from "@/components/homepage/TechnologySection";
import ReferralSection from "@/components/homepage/ReferralSection";
import SecuritySection from "@/components/homepage/SecuritySection";
import LiveStats from "@/components/homepage/LiveStats";
import FaqSection from "@/components/homepage/FaqSection";
import HomepageFooter from "@/components/homepage/HomepageFooter";
import HomepageNav from "@/components/homepage/HomepageNav";
import SeoHead from "@/components/homepage/SeoHead";
import FloatingParticles from "@/components/homepage/FloatingParticles";
import LiveActivityFeed from "@/components/homepage/LiveActivityFeed";
import ProfitBubbles from "@/components/homepage/ProfitBubbles";
import InteractiveTradePreview from "@/components/homepage/InteractiveTradePreview";
import ApplyCta from "@/components/homepage/ApplyCta";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLiveElementSettings } from "@/hooks/useLiveElementSettings";

export default function Homepage() {
  useSiteSettings();
  const liveSettings = useLiveElementSettings();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <SeoHead />
      {liveSettings.floating_particles && <FloatingParticles />}
      {liveSettings.profit_bubbles && <ProfitBubbles />}
      {liveSettings.activity_feed && <LiveActivityFeed />}
      <HomepageNav />
      <HeroSection />
      <HowItWorks />
      <WhyChoose />
      <TechnologySection />
      <InteractiveTradePreview />
      <ReferralSection />
      <SecuritySection />
      <LiveStats />
      <FaqSection />
      <HomepageFooter />
    </div>
  );
}
