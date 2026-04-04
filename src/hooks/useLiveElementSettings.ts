import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LiveElementSettings {
  floating_particles: boolean;
  activity_feed: boolean;
  profit_bubbles: boolean;
  animation_intensity: "low" | "medium" | "high";
}

const DEFAULTS: LiveElementSettings = {
  floating_particles: true,
  activity_feed: true,
  profit_bubbles: true,
  animation_intensity: "medium",
};

let cache: LiveElementSettings | null = null;

export function useLiveElementSettings() {
  const [settings, setSettings] = useState<LiveElementSettings>(cache || DEFAULTS);

  useEffect(() => {
    if (cache) return;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["floating_particles_enabled", "activity_feed_enabled", "profit_bubbles_enabled", "animation_intensity"])
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const map: Record<string, string> = {};
        data.forEach((r: any) => (map[r.key] = r.value));
        const parsed: LiveElementSettings = {
          floating_particles: map.floating_particles_enabled !== "false",
          activity_feed: map.activity_feed_enabled !== "false",
          profit_bubbles: map.profit_bubbles_enabled !== "false",
          animation_intensity: (map.animation_intensity as LiveElementSettings["animation_intensity"]) || "medium",
        };
        cache = parsed;
        setSettings(parsed);
      });
  }, []);

  return settings;
}
