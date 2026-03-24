import { useSiteSettings } from "@/hooks/useSiteSettings";

interface SiteLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function SiteLogo({ size = "md", showText = false }: SiteLogoProps) {
  const { logo_url } = useSiteSettings();

  const heightMap = { sm: "h-6", md: "h-8", lg: "h-10" };

  if (!logo_url) {
    return <div className={`${heightMap[size]} w-auto`} />;
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={logo_url}
        alt="FlashArbitrage"
        className={`${heightMap[size]} w-auto object-contain`}
      />
    </div>
  );
}
