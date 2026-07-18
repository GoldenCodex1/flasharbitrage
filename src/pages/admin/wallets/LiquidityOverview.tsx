import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

export default function LiquidityOverview() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});

  // Wallet balances by type
  const { data: wallets } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").is("archived_at" as any, null);
      return (data as any[]) ?? [];
    },
  });

  // User liability (total user balances from ledger)
  const { data: liability } = useQuery({
    queryKey: ["platform-liability"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("type, amount");
      if (!data) return 0;
      return data.reduce((sum, t) => {
        const credit = ["deposit", "trade_return", "profit", "refund", "adjustment", "referral"].includes(t.type);
        return sum + (credit ? t.amount : -t.amount);
      }, 0);
    },
  });

  // Liquidity rules
  const { data: rules } = useQuery({
    queryKey: ["liquidity-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("liquidity_rules" as any).select("*").limit(1);
      return (data as any[])?.[0] ?? null;
    },
  });

  const hotBalance = wallets?.filter((w: any) => w.wallet_type === "hot" && w.is_active).reduce((s: number, w: any) => s + Number(w.balance || 0), 0) ?? 0;
  const coldBalance = wallets?.filter((w: any) => w.wallet_type === "cold").reduce((s: number, w: any) => s + Number(w.balance || 0), 0) ?? 0;
  const reserveBalance = wallets?.filter((w: any) => w.wallet_type === "reserve").reduce((s: number, w: any) => s + Number(w.balance || 0), 0) ?? 0;
  const totalBalance = hotBalance + coldBalance + reserveBalance;
  const userLiability = liability ?? 0;
  const coverageRatio = userLiability > 0 ? (hotBalance / userLiability) * 100 : 100;
  const bufferPercent = userLiability > 0 ? ((totalBalance - userLiability) / userLiability) * 100 : 100;

  const coverageColor = coverageRatio > 120 ? "text-green-400" : coverageRatio >= 100 ? "text-yellow-400" : "text-red-400";
  const coverageBg = coverageRatio > 120 ? "bg-green-500" : coverageRatio >= 100 ? "bg-yellow-500" : "bg-red-500";

  const getVal = (field: string) => edits[field] ?? rules?.[field];
  const setVal = (field: string, value: any) => setEdits((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!rules || Object.keys(edits).length === 0) { toast.info("No changes"); return; }
    setSaving(true);
    const { error } = await supabase.from("liquidity_rules" as any).update(edits).eq("id", rules.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Liquidity rules saved");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["liquidity-rules"] });
    }
    setSaving(false);
  };

  const inputCls = "bg-secondary border border-border/30 rounded-lg px-3 py-1.5 text-sm text-foreground w-full";

  const metrics = [
    { label: "Hot Wallet", value: `$${hotBalance.toLocaleString()}`, sub: "Available for operations" },
    { label: "Cold Storage", value: `$${coldBalance.toLocaleString()}`, sub: "Secured offline" },
    { label: "Reserve", value: `$${reserveBalance.toLocaleString()}`, sub: "Liquidity buffer" },
    { label: "User Liability", value: `$${userLiability.toLocaleString()}`, sub: "Total owed to users" },
  ];

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg">Treasury Liquidity Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time platform solvency and coverage metrics.</p>
        </div>
        {coverageRatio < 100 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">CRITICAL: Coverage Below 100%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-secondary/30 rounded-xl p-3.5 border border-border/10">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="font-display font-bold text-lg mt-1">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Coverage Ratio */}
      <div className="bg-secondary/20 rounded-xl p-4 border border-border/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Withdrawal Coverage Ratio</span>
          <span className={`font-display font-bold text-lg ${coverageColor}`}>{coverageRatio.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(coverageRatio, 150)} className="h-2.5" />
        <p className="text-[10px] text-muted-foreground">Hot Wallet Balance / Total User Liability</p>
      </div>

      {/* Liquidity Rules */}
      {rules && (
        <div className="border-t border-border/20 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Liquidity Rules</h4>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Buffer %</label>
              <input type="number" value={getVal("min_buffer_percent")} onChange={(e) => setVal("min_buffer_percent", Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Emergency Threshold %</label>
              <input type="number" value={getVal("emergency_threshold_percent")} onChange={(e) => setVal("emergency_threshold_percent", Number(e.target.value))} className={inputCls} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={getVal("auto_disable_withdrawals")} onCheckedChange={(v) => setVal("auto_disable_withdrawals", v)} />
              <span className="text-xs text-muted-foreground">Auto-Disable Withdrawals</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
