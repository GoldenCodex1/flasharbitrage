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

  // Update favicon in DOM (remove all existing icon links, then add fresh)
  useEffect(() => {
    if (!settings.favicon_url) return;
    document
      .querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']")
      .forEach((el) => el.parentNode?.removeChild(el));
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    // cache-bust so browsers don't keep the old one
    link.href = `${settings.favicon_url}?v=${Date.now()}`;
    document.head.appendChild(link);
  }, [settings.favicon_url]);

  return settings;
}
