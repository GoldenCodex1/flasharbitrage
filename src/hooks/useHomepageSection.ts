import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SectionItem {
  icon: string;
  title: string;
  desc: string;
}

interface SectionData {
  title: string;
  subtitle: string;
  items: SectionItem[];
}

const cache: Record<string, SectionData> = {};

export function useHomepageSection(sectionKey: string, defaults: SectionData) {
  const [data, setData] = useState<SectionData>(cache[sectionKey] || defaults);

  useEffect(() => {
    if (cache[sectionKey]) return;
    supabase
      .from("homepage_sections")
      .select("title, subtitle, items")
      .eq("section_key", sectionKey)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          const parsed: SectionData = {
            title: row.title,
            subtitle: row.subtitle,
            items: (row.items as unknown as SectionItem[]) || defaults.items,
          };
          cache[sectionKey] = parsed;
          setData(parsed);
        }
      });
  }, [sectionKey]);

  return data;
}
