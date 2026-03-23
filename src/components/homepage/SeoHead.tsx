import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SeoData {
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  keywords: string;
}

const defaults: SeoData = {
  meta_title: "FlashArbitrage – AI-Powered Crypto Arbitrage",
  meta_description: "Automated crypto arbitrage trading platform powered by AI.",
  og_title: "FlashArbitrage – AI-Powered Crypto Arbitrage",
  og_description: "Automated crypto arbitrage trading platform powered by AI.",
  og_image: "",
  keywords: "crypto, arbitrage, AI, trading",
};

export default function SeoHead() {
  const [seo, setSeo] = useState<SeoData>(defaults);

  useEffect(() => {
    supabase.from("homepage_seo").select("*").limit(1).single().then(({ data }) => {
      if (data) setSeo(data);
    });
  }, []);

  useEffect(() => {
    document.title = seo.meta_title;

    const setMeta = (name: string, content: string, attr = "name") => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", seo.meta_description);
    setMeta("keywords", seo.keywords);
    setMeta("og:title", seo.og_title, "property");
    setMeta("og:description", seo.og_description, "property");
    if (seo.og_image) setMeta("og:image", seo.og_image, "property");
  }, [seo]);

  return null;
}
