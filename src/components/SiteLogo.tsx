import { useSiteSettings } from "@/hooks/useSiteSettings";
import fallbackLogo from "@/assets/site-logo.jpg";

interface SiteLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function SiteLogo({ size = "md", showText = false }: SiteLogoProps) {
  const { logo_url } = useSiteSettings();

  const heightMap = { sm: "h-6", md: "h-8", lg: "h-10" };
  const src = logo_url || fallbackLogo;

  return (
    <div className="flex items-center gap-2">
      <img
        src={src}
        alt="FlashArbitrage"
        className={`${heightMap[size]} w-auto object-contain`}
      />
    </div>
  );
}
