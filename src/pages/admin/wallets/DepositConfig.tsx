import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function DepositConfig() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["deposit-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("deposit_settings" as any).select("*").order("currency");
      return (data as any[]) ?? [];
    },
  });

  const [edits, setEdits] = useState<Record<string, any>>({});

  const getVal = (row: any, field: string) => {
    return edits[row.id]?.[field] ?? row[field];
  };

  const setVal = (row: any, field: string, value: any) => {
    setEdits((prev) => ({
      ...prev,
      [row.id]: { ...prev[row.id], [field]: value },
    }));
  };

  const handleSave = async (row: any) => {
    const changes = edits[row.id];
    if (!changes || Object.keys(changes).length === 0) {
      toast.info("No changes");
      return;
    }
    setSaving(row.id);
    const { error } = await supabase.from("deposit_settings" as any).update(changes).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${row.currency} deposit settings saved`);
      setEdits((prev) => {
        const copy = { ...prev };
        delete copy[row.id];
        return copy;
      });
      qc.invalidateQueries({ queryKey: ["deposit-settings"] });
    }
    setSaving(null);
  };

  const inputCls = "bg-secondary border border-border/30 rounded-lg px-3 py-1.5 text-sm text-foreground w-full";

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="font-display font-semibold text-base sm:text-lg">Deposit Configuration</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Per-currency deposit limits, auto-approval rules, and review thresholds.
        </p>
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
                <label className="text-xs text-muted-foreground mb-1 block">Confirmations</label>
                <input type="number" value={getVal(row, "confirmations_required")} onChange={(e) => setVal(row, "confirmations_required", Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Review Threshold</label>
                <input type="number" value={getVal(row, "manual_review_threshold")} onChange={(e) => setVal(row, "manual_review_threshold", Number(e.target.value))} className={inputCls} />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={getVal(row, "auto_approve")} onCheckedChange={(v) => setVal(row, "auto_approve", v)} />
                <span className="text-xs text-muted-foreground">Auto Approve</span>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={getVal(row, "address_rotation_enabled")} onCheckedChange={(v) => setVal(row, "address_rotation_enabled", v)} />
                <span className="text-xs text-muted-foreground">Address Rotation</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
