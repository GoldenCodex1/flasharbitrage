import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { useState, useEffect } from "react";

const fields: { key: string; label: string; warn?: boolean; threshold?: number }[] = [
  { key: "min_roi_percent", label: "Minimum ROI %" },
  { key: "max_roi_percent", label: "Maximum ROI %", warn: true, threshold: 20 },
  { key: "min_trade_duration_min", label: "Min Trade Duration (min)" },
  { key: "max_trade_duration_min", label: "Max Trade Duration (min)" },
  { key: "spread_tolerance_percent", label: "Spread Tolerance %" },
  { key: "slippage_control_percent", label: "Slippage Control %" },
  { key: "max_loss_per_trade", label: "Max Loss Per Trade ($)" },
  { key: "max_daily_platform_loss", label: "Max Daily Platform Loss ($)" },
];

export default function BotStrategyConfig() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["bot-strategy-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_strategy_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings) {
      const f: Record<string, number> = {};
      fields.forEach(({ key }) => { f[key] = Number((settings as any)[key]); });
      setForm(f);
    }
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    if ((form.min_roi_percent ?? 0) >= (form.max_roi_percent ?? 0)) {
      toast.error("Min ROI must be less than Max ROI");
      return;
    }
    if ((form.min_trade_duration_min ?? 0) >= (form.max_trade_duration_min ?? 0)) {
      toast.error("Min duration must be less than Max duration");
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bot_strategy_settings").update({
      ...form,
      updated_by: user?.id,
    }).eq("id", settings.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("bot_logs").insert({
        admin_id: user?.id,
        action_type: "strategy_settings_update",
        category: "strategy",
        previous_value: JSON.stringify(settings),
        new_value: JSON.stringify(form),
      });
      toast.success("Strategy settings saved");
      qc.invalidateQueries({ queryKey: ["bot-strategy-settings"] });
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Strategy Configuration</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map(({ key, label, warn, threshold }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="number"
              step="0.01"
              value={form[key] ?? ""}
              onChange={(e) => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
              className={warn && (form[key] ?? 0) > (threshold ?? 0) ? "border-warning" : ""}
            />
            {warn && (form[key] ?? 0) > (threshold ?? 0) && (
              <p className="text-xs text-warning">⚠ Above safe threshold ({threshold}%)</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="sm">Save Strategy</Button>
      </div>
    </div>
  );
}
