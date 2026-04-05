import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteLogo from "@/components/SiteLogo";

interface FooterLink {
  title: string;
  slug: string;
}

interface SocialLink {
  label: string;
  url: string;
}

export default function HomepageFooter() {
  const [pages, setPages] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    supabase
      .from("footer_pages")
      .select("title, slug")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => setPages(data || []));

    supabase
      .from("site_settings")
      .select("key, value")
      .like("key", "social_%")
      .then(({ data }) => {
        const labels: Record<string, string> = {
          social_telegram: "Telegram",
          social_twitter: "Twitter",
          social_instagram: "Instagram",
          social_discord: "Discord",
          social_youtube: "YouTube",
        };
        const links = (data || [])
          .filter((s) => s.value && s.value.trim() !== "")
          .map((s) => ({ label: labels[s.key] || s.key, url: s.value }));
        setSocialLinks(links);
      });
  }, []);

  const companyPages = pages.filter((p) => ["about", "contact", "team"].includes(p.slug));
  const legalPages = pages.filter((p) => ["privacy-policy", "terms-of-service"].includes(p.slug));
  const otherPages = pages.filter((p) => !["about", "contact", "team", "privacy-policy", "terms-of-service"].includes(p.slug));

  return (
    <footer className="border-t border-border/30 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {companyPages.map((p) => (
                <li key={p.slug}>
                  <Link to={p.slug === "team" ? "/team" : `/page/${p.slug}`} className="hover:text-foreground transition-colors">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {legalPages.map((p) => (
                <li key={p.slug}>
                  <Link to={`/page/${p.slug}`} className="hover:text-foreground transition-colors">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Login</Link></li>
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Register</Link></li>
              <li><Link to="/apply" className="hover:text-foreground transition-colors">Apply</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Social</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {socialLinks.length > 0 ? (
                socialLinks.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                      {s.label}
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground/50 text-xs">No social links configured</li>
              )}
            </ul>
          </div>
        </div>
        {otherPages.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
            {otherPages.map((p) => (
              <Link key={p.slug} to={`/page/${p.slug}`} className="hover:text-foreground transition-colors">{p.title}</Link>
            ))}
          </div>
        )}
        <div className="glow-line mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SiteLogo size="sm" />
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} FlashArbitrage. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
