import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function WithdrawalConfig() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["withdrawal-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawal_settings" as any).select("*").order("currency");
      return (data as any[]) ?? [];
    },
  });

  const [edits, setEdits] = useState<Record<string, any>>({});

  const getVal = (row: any, field: string) => edits[row.id]?.[field] ?? row[field];
  const setVal = (row: any, field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [row.id]: { ...prev[row.id], [field]: value } }));
  };

  const handleSave = async (row: any) => {
    const changes = edits[row.id];
    if (!changes || Object.keys(changes).length === 0) { toast.info("No changes"); return; }
    setSaving(row.id);
    const { error } = await supabase.from("withdrawal_settings" as any).update(changes).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${row.currency} withdrawal settings saved`);
      setEdits((prev) => { const c = { ...prev }; delete c[row.id]; return c; });
      qc.invalidateQueries({ queryKey: ["withdrawal-settings"] });
    }
    setSaving(null);
  };

  const inputCls = "bg-secondary border border-border/30 rounded-lg px-3 py-1.5 text-sm text-foreground w-full";

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" />
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg">Withdrawal Risk & Limits</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per-currency withdrawal limits, risk thresholds, fees, and security requirements.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {settings?.map((row: any) => (
          <div key={row.id} className="border border-border/20 rounded-xl p-4 bg-secondary/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{row.currency}</span>
              <Button size="sm" onClick={() => handleSave(row)} disabled={saving === row.id}>
                {saving === row.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Amount</label>
                <input type="number" value={getVal(row, "min_amount")} onChange={(e) => setVal(row, "min_amount", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Amount</label>
                <input type="number" value={getVal(row, "max_amount")} onChange={(e) => setVal(row, "max_amount", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Daily Limit</label>
                <input type="number" value={getVal(row, "daily_limit")} onChange={(e) => setVal(row, "daily_limit", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Auto Approve ≤</label>
                <input type="number" value={getVal(row, "auto_approve_threshold")} onChange={(e) => setVal(row, "auto_approve_threshold", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">High Risk ≥</label>
                <input type="number" value={getVal(row, "high_risk_threshold")} onChange={(e) => setVal(row, "high_risk_threshold", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cooldown (min)</label>
                <input type="number" value={getVal(row, "cooldown_minutes")} onChange={(e) => setVal(row, "cooldown_minutes", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fee Type</label>
                <select value={getVal(row, "fee_type")} onChange={(e) => setVal(row, "fee_type", e.target.value)} className={inputCls}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fee Value</label>
                <input type="number" step="0.01" value={getVal(row, "fee_value")} onChange={(e) => setVal(row, "fee_value", Number(e.target.value))} className={inputCls} />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={getVal(row, "require_2fa")} onCheckedChange={(v) => setVal(row, "require_2fa", v)} />
                <span className="text-xs text-muted-foreground">Require 2FA</span>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={getVal(row, "require_ip_match")} onCheckedChange={(v) => setVal(row, "require_ip_match", v)} />
                <span className="text-xs text-muted-foreground">Require IP Match</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
