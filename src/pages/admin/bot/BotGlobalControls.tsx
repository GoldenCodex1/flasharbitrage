import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Power, Shield, DollarSign, Layers, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function BotGlobalControls() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["bot-global-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_global_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    enabled: true,
    global_risk_mode: "moderate",
    max_platform_exposure: 100000,
    max_concurrent_trades: 50,
    trading_window_start: "00:00",
    trading_window_end: "23:59",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled,
        global_risk_mode: settings.global_risk_mode,
        max_platform_exposure: Number(settings.max_platform_exposure),
        max_concurrent_trades: settings.max_concurrent_trades,
        trading_window_start: settings.trading_window_start ?? "00:00",
        trading_window_end: settings.trading_window_end ?? "23:59",
      });
    }
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    const { error } = await supabase.from("bot_global_settings").update({
      ...form,
      updated_by: (await supabase.auth.getUser()).data.user?.id,
    }).eq("id", settings.id);

    if (error) toast.error(error.message);
    else {
      // Log the action
      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from("bot_logs").insert({
        admin_id: user?.id,
        action_type: "global_settings_update",
        category: "global",
        previous_value: JSON.stringify(settings),
        new_value: JSON.stringify(form),
      });
      toast.success("Global settings saved");
      qc.invalidateQueries({ queryKey: ["bot-global-settings"] });
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Power className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Global Master Controls</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Kill Switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20">
          <div className="flex items-center gap-2">
            <Power className={`w-4 h-4 ${form.enabled ? "text-success" : "text-destructive"}`} />
            <Label className="text-sm font-medium">Global Bot Kill Switch</Label>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm(f => ({ ...f, enabled: v }))} />
        </div>

        {/* Risk Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Global Risk Mode</Label>
          </div>
          <Select value={form.global_risk_mode} onValueChange={(v) => setForm(f => ({ ...f, global_risk_mode: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Exposure */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Max Platform Exposure ($)</Label>
          </div>
          <Input type="number" value={form.max_platform_exposure} onChange={(e) => setForm(f => ({ ...f, max_platform_exposure: Number(e.target.value) }))} />
        </div>

        {/* Max Concurrent */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Max Concurrent Trades</Label>
          </div>
          <Input type="number" value={form.max_concurrent_trades} onChange={(e) => setForm(f => ({ ...f, max_concurrent_trades: Number(e.target.value) }))} />
        </div>

        {/* Trading Window */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Trading Window Start</Label>
          </div>
          <Input type="time" value={form.trading_window_start} onChange={(e) => setForm(f => ({ ...f, trading_window_start: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Trading Window End</Label>
          </div>
          <Input type="time" value={form.trading_window_end} onChange={(e) => setForm(f => ({ ...f, trading_window_end: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="sm">Save Global Settings</Button>
      </div>
    </div>
  );
}
