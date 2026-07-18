import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ApplyContent {
  hero_title: string;
  hero_subtitle: string;
  badge_text: string;
  scarcity_text: string;
  counter_leaders: number;
  counter_countries: number;
  counter_paid: number;
  earning_l1: string;
  earning_l2: string;
  earning_l3: string;
  sim_referral_multiplier: number;
  sim_team_multiplier: number;
  leaderboard_visible: boolean;
}

const DEFAULTS: ApplyContent = {
  hero_title: "Become a Regional Leader — Build & Earn Across Your Country",
  hero_subtitle: "Join our global expansion and earn from your network, team, and leadership position.",
  badge_text: "Now Recruiting",
  scarcity_text: "Limited Slots Per Country — Apply Now",
  counter_leaders: 320,
  counter_countries: 48,
  counter_paid: 1200000,
  earning_l1: "5%",
  earning_l2: "2%",
  earning_l3: "1%",
  sim_referral_multiplier: 50,
  sim_team_multiplier: 12,
  leaderboard_visible: true,
};

let cache: ApplyContent | null = null;

export function useApplyContent() {
  const [content, setContent] = useState<ApplyContent>(cache || DEFAULTS);

  useEffect(() => {
    if (cache) return;
    supabase
      .from("site_settings")
      .select("key, value")
      .like("key", "apply_%")
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const map: Record<string, string> = {};
        data.forEach((r: any) => (map[r.key] = r.value));
        const parsed: ApplyContent = {
          hero_title: map.apply_hero_title || DEFAULTS.hero_title,
          hero_subtitle: map.apply_hero_subtitle || DEFAULTS.hero_subtitle,
          badge_text: map.apply_badge_text || DEFAULTS.badge_text,
          scarcity_text: map.apply_scarcity_text || DEFAULTS.scarcity_text,
          counter_leaders: parseInt(map.apply_counter_leaders) || DEFAULTS.counter_leaders,
          counter_countries: parseInt(map.apply_counter_countries) || DEFAULTS.counter_countries,
          counter_paid: parseInt(map.apply_counter_paid) || DEFAULTS.counter_paid,
          earning_l1: map.apply_earning_l1 || DEFAULTS.earning_l1,
          earning_l2: map.apply_earning_l2 || DEFAULTS.earning_l2,
          earning_l3: map.apply_earning_l3 || DEFAULTS.earning_l3,
          sim_referral_multiplier: parseInt(map.apply_sim_referral_multiplier) || DEFAULTS.sim_referral_multiplier,
          sim_team_multiplier: parseInt(map.apply_sim_team_multiplier) || DEFAULTS.sim_team_multiplier,
          leaderboard_visible: map.apply_leaderboard_visible !== "false",
        };
        cache = parsed;
        setContent(parsed);
      });
  }, []);

  return content;
}
