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
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Homepage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SeoHead />
      <HomepageNav />
      <HeroSection />
      <HowItWorks />
      <WhyChoose />
      <TechnologySection />
      <ReferralSection />
      <SecuritySection />
      <LiveStats />
      <FaqSection />
      <HomepageFooter />
    </div>
  );
}
