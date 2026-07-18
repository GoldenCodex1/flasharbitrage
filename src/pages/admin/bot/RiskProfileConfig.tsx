import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";

interface RiskProfile {
  id: string;
  profile_name: string;
  roi_min: number;
  roi_max: number;
  volatility_level: string;
  updated_at: string;
}

export default function RiskProfileConfig() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["risk-profile-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_profile_config")
        .select("*")
        .order("roi_min", { ascending: true });
      return (data ?? []) as RiskProfile[];
    },
  });

  const [form, setForm] = useState<RiskProfile[]>([]);

  useEffect(() => {
    if (profiles) setForm(profiles.map(p => ({ ...p })));
  }, [profiles]);

  const update = (idx: number, field: keyof RiskProfile, value: string | number) => {
    setForm(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const save = async () => {
    for (const p of form) {
      if (p.roi_min >= p.roi_max) {
        toast.error(`${p.profile_name}: Min ROI must be less than Max ROI`);
        return;
      }
    }

    const user = (await supabase.auth.getUser()).data.user;

    for (const p of form) {
      const { error } = await supabase
        .from("risk_profile_config")
        .update({
          roi_min: p.roi_min,
          roi_max: p.roi_max,
          volatility_level: p.volatility_level,
        })
        .eq("id", p.id);

      if (error) {
        toast.error(`Failed to save ${p.profile_name}: ${error.message}`);
        return;
      }
    }

    await supabase.from("bot_logs").insert({
      admin_id: user?.id,
      action_type: "risk_profile_update",
      category: "strategy",
      previous_value: JSON.stringify(profiles),
      new_value: JSON.stringify(form),
    });

    toast.success("Risk profiles saved");
    qc.invalidateQueries({ queryKey: ["risk-profile-config"] });
  };

  if (!form.length) return null;

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Risk Profile Configuration</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Define the ROI range and volatility level for each risk profile. These govern how the bot selects trades for users based on their chosen risk level.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {form.map((profile, idx) => (
          <div
            key={profile.id}
            className="p-4 rounded-xl bg-secondary/30 border border-border/20 space-y-3"
          >
            <h4 className="font-display font-semibold text-sm text-foreground">
              {profile.profile_name}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min ROI %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={profile.roi_min}
                  onChange={(e) => update(idx, "roi_min", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max ROI %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={profile.roi_max}
                  onChange={(e) => update(idx, "roi_max", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Volatility Level</Label>
              <Select
                value={profile.volatility_level}
                onValueChange={(v) => update(idx, "volatility_level", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="sm">Save Risk Profiles</Button>
      </div>
    </div>
  );
}
