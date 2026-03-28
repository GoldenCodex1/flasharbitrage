import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TawkToWidget() {
  const [script, setScript] = useState("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "tawkto_embed_code")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setScript(data.value);
      });
  }, []);

  useEffect(() => {
    if (!script) return;

    // Extract the src URL from the tawk.to script tag
    const srcMatch = script.match(/src="([^"]+)"/);
    if (srcMatch?.[1]) {
      const s = document.createElement("script");
      s.async = true;
      s.src = srcMatch[1];
      s.charset = "UTF-8";
      s.setAttribute("crossorigin", "*");
      document.body.appendChild(s);
      return () => {
        document.body.removeChild(s);
        // Clean up tawk.to globals
        const w = window as any;
        if (w.Tawk_API) delete w.Tawk_API;
        if (w.Tawk_LoadStart) delete w.Tawk_LoadStart;
      };
    }

    // Fallback: extract and eval inline script content
    const codeMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (codeMatch?.[1]) {
      try {
        const fn = new Function(codeMatch[1]);
        fn();
      } catch (e) {
        console.error("Tawk.to script error:", e);
      }
    }
  }, [script]);

  return null;
}
