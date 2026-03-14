import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  logo_url: string;
  favicon_url: string;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>({ logo_url: "", favicon_url: "" });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: any) => (map[r.key] = r.value));
          setSettings({ logo_url: map.logo_url || "", favicon_url: map.favicon_url || "" });
        }
      });
  }, []);

  // Update favicon in DOM
  useEffect(() => {
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings.favicon_url]);

  return settings;
}
