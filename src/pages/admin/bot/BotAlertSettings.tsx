import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { useState, useEffect } from "react";

export default function BotAlertSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["bot-alert-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_alert_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    drawdown_threshold_percent: 10,
    consecutive_loss_limit: 5,
    daily_loss_cap: 5000,
    exposure_spike_percent: 80,
    api_failure_alert: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        drawdown_threshold_percent: Number(settings.drawdown_threshold_percent),
        consecutive_loss_limit: settings.consecutive_loss_limit,
        daily_loss_cap: Number(settings.daily_loss_cap),
        exposure_spike_percent: Number(settings.exposure_spike_percent),
        api_failure_alert: settings.api_failure_alert,
      });
    }
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bot_alert_settings").update({ ...form, updated_by: user?.id }).eq("id", settings.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("bot_logs").insert({ admin_id: user?.id, action_type: "alert_settings_update", category: "alerts", previous_value: JSON.stringify(settings), new_value: JSON.stringify(form) });
      toast.success("Alert settings saved");
      qc.invalidateQueries({ queryKey: ["bot-alert-settings"] });
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-warning" />
        <h3 className="font-display font-semibold text-base">Alert Configuration</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Drawdown Threshold %</Label>
          <Input type="number" value={form.drawdown_threshold_percent} onChange={(e) => setForm(f => ({ ...f, drawdown_threshold_percent: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Consecutive Loss Limit</Label>
          <Input type="number" value={form.consecutive_loss_limit} onChange={(e) => setForm(f => ({ ...f, consecutive_loss_limit: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Daily Loss Cap ($)</Label>
          <Input type="number" value={form.daily_loss_cap} onChange={(e) => setForm(f => ({ ...f, daily_loss_cap: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Exposure Spike %</Label>
          <Input type="number" value={form.exposure_spike_percent} onChange={(e) => setForm(f => ({ ...f, exposure_spike_percent: Number(e.target.value) }))} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20">
          <Label className="text-sm">API Failure Alerts</Label>
          <Switch checked={form.api_failure_alert} onCheckedChange={(v) => setForm(f => ({ ...f, api_failure_alert: v }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="sm">Save Alert Settings</Button>
      </div>
    </div>
  );
}
