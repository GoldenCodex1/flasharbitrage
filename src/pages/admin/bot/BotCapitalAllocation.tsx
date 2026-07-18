import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Wallet } from "lucide-react";
import { useState, useEffect } from "react";

export default function BotCapitalAllocation() {
  const qc = useQueryClient();
  const { data: rules } = useQuery({
    queryKey: ["bot-capital-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_capital_rules").select("*").limit(1).single();
      return data;
    },
  });

  const { data: utilization } = useQuery({
    queryKey: ["bot-capital-utilization"],
    queryFn: async () => {
      const { data: active } = await supabase.from("trade_entries").select("amount").eq("status", "active");
      const { data: txs } = await supabase.from("transactions").select("amount");
      const totalCapital = txs?.reduce((s, t) => s + Number(t.amount), 0) ?? 1;
      const activeCapital = active?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      return totalCapital > 0 ? Math.min(100, (activeCapital / totalCapital) * 100) : 0;
    },
  });

  const [form, setForm] = useState({
    wallet_allocation_percent: 50,
    capital_locked_per_trade_percent: 10,
    liquidity_buffer_percent: 20,
    auto_rebalance: false,
  });

  useEffect(() => {
    if (rules) {
      setForm({
        wallet_allocation_percent: Number(rules.wallet_allocation_percent),
        capital_locked_per_trade_percent: Number(rules.capital_locked_per_trade_percent),
        liquidity_buffer_percent: Number(rules.liquidity_buffer_percent),
        auto_rebalance: rules.auto_rebalance,
      });
    }
  }, [rules]);

  const save = async () => {
    if (!rules) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bot_capital_rules").update({ ...form, updated_by: user?.id }).eq("id", rules.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("bot_logs").insert({ admin_id: user?.id, action_type: "capital_rules_update", category: "capital", previous_value: JSON.stringify(rules), new_value: JSON.stringify(form) });
      toast.success("Capital rules saved");
      qc.invalidateQueries({ queryKey: ["bot-capital-rules"] });
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Capital Allocation</h3>
      </div>

      <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Capital Utilization</span>
          <span className="font-medium">{(utilization ?? 0).toFixed(1)}%</span>
        </div>
        <Progress value={utilization ?? 0} className="h-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Wallet Allocation %</Label>
          <Input type="number" value={form.wallet_allocation_percent} onChange={(e) => setForm(f => ({ ...f, wallet_allocation_percent: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Capital Locked Per Trade %</Label>
          <Input type="number" value={form.capital_locked_per_trade_percent} onChange={(e) => setForm(f => ({ ...f, capital_locked_per_trade_percent: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Liquidity Buffer %</Label>
          <Input type="number" value={form.liquidity_buffer_percent} onChange={(e) => setForm(f => ({ ...f, liquidity_buffer_percent: Number(e.target.value) }))} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20">
          <Label className="text-sm">Auto Rebalance</Label>
          <Switch checked={form.auto_rebalance} onCheckedChange={(v) => setForm(f => ({ ...f, auto_rebalance: v }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="sm">Save Capital Rules</Button>
      </div>
    </div>
  );
}
