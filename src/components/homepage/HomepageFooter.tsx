import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteLogo from "@/components/SiteLogo";

interface FooterLink {
  title: string;
  slug: string;
}

export default function HomepageFooter() {
  const [pages, setPages] = useState<FooterLink[]>([]);

  useEffect(() => {
    supabase
      .from("footer_pages")
      .select("title, slug")
      .eq("is_visible", true)
      .order("display_order")
      .then(({ data }) => setPages(data || []));
  }, []);

  // Split pages into company/legal groups
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
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Social</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Telegram</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Instagram</a></li>
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
