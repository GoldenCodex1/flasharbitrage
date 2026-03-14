import { useSiteSettings } from "@/hooks/useSiteSettings";

interface SiteLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function SiteLogo({ size = "md", showText = true }: SiteLogoProps) {
  const { logo_url } = useSiteSettings();

  const sizeMap = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };
  const textSizeMap = { sm: "text-sm", md: "text-lg", lg: "text-xl" };

  return (
    <div className="flex items-center gap-2">
      {logo_url ? (
        <img src={logo_url} alt="Logo" className={`${sizeMap[size]} object-contain rounded-lg`} />
      ) : (
        <div className={`${sizeMap[size]} rounded-lg bg-primary flex items-center justify-center`}>
          <span className="text-primary-foreground font-display font-bold text-sm">A</span>
        </div>
      )}
      {showText && (
        <span className={`font-display font-bold ${textSizeMap[size]}`}>
          Arb<span className="text-primary">AI</span>
        </span>
      )}
    </div>
  );
}
