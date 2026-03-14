import { motion } from "framer-motion";
import { ArrowLeft, Users, DollarSign, Shield, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    running: "bg-primary/10 text-primary",
    closed: "bg-warning/10 text-warning",
    settled: "bg-success/20 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

// Valid transitions
const TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["running", "closed", "cancelled"],
  running: ["closed"],
  closed: ["settled", "cancelled"],
};

export default function AdminTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const { data: trade, isLoading } = useQuery({
    queryKey: ["admin-trade", id],
    queryFn: async () => {
      const { data } = await supabase.from("trades").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: participants } = useQuery({
    queryKey: ["admin-trade-participants", id],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("*").eq("trade_id", id!).order("started_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name ?? "Unknown"; });
      return map;
    },
  });

  const stats = useMemo(() => {
    if (!participants || !trade) return { investors: 0, totalCapital: 0, expectedPayout: 0, timeRemaining: "" };
    const totalCapital = participants.reduce((s, p) => s + Number(p.amount), 0);
    const roi = Number(trade.roi_percent) / 100;
    const expectedPayout = totalCapital * (1 + roi);
    let timeRemaining = "—";
    if (trade.expires_at) {
      const diff = new Date(trade.expires_at).getTime() - Date.now();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        timeRemaining = `${h}h ${m}m`;
      } else {
        timeRemaining = "Expired";
      }
    }
    return { investors: participants.length, totalCapital, expectedPayout, timeRemaining };
  }, [participants, trade]);

  const maxCap = trade ? ((trade as any).capital_cap ? Number((trade as any).capital_cap) : Number(trade.max_investment) * trade.slot_limit) : 0;
  const capPercent = maxCap > 0 ? Math.min((stats.totalCapital / maxCap) * 100, 100) : 0;

  const handleTransition = async (nextStatus: string) => {
    if (!trade) return;
    setConfirmAction(null);

    // For settlement: create ledger entries for each participant
    if (nextStatus === "settled") {
      const roi = Number(trade.roi_percent) / 100;
      for (const p of participants ?? []) {
        const profit = Number(p.amount) * roi;
        // Update trade entry
        await supabase.from("trade_entries").update({
          status: "completed",
          profit,
          completed_at: new Date().toISOString(),
        }).eq("id", p.id);
        // Create ledger transaction
        await supabase.from("transactions").insert({
          user_id: p.user_id,
          type: "profit",
          amount: profit,
          description: `Trade settlement: ${trade.title}`,
          reference_id: trade.id,
        });
        // Return principal
        await supabase.from("transactions").insert({
          user_id: p.user_id,
          type: "trade_return",
          amount: Number(p.amount),
          description: `Principal return: ${trade.title}`,
          reference_id: trade.id,
        });
      }
    }

    // For cancellation: refund all
    if (nextStatus === "cancelled") {
      for (const p of participants ?? []) {
        if (p.status === "active") {
          await supabase.from("trade_entries").update({ status: "refunded", completed_at: new Date().toISOString() }).eq("id", p.id);
          await supabase.from("transactions").insert({
            user_id: p.user_id,
            type: "refund",
            amount: Number(p.amount),
            description: `Trade cancelled refund: ${trade.title}`,
            reference_id: trade.id,
          });
        }
      }
    }

    const updatePayload: any = { status: nextStatus };
    if (nextStatus === "active") {
      // Set expires_at based on duration_hours for automatic lifecycle
      updatePayload.expires_at = new Date(Date.now() + Number(trade.duration_hours) * 3600000).toISOString();
    }
    if (nextStatus === "settled" || nextStatus === "cancelled") {
      updatePayload.settlement_date = new Date().toISOString();
    }

    const { error } = await supabase.from("trades").update(updatePayload).eq("id", trade.id);
    if (error) { toast.error(error.message); return; }

    // Log action
    await supabase.from("admin_action_logs").insert({
      section: "trades",
      field_name: "status",
      old_value: trade.status,
      new_value: nextStatus,
      admin_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    });

    toast.success(`Trade status → ${nextStatus}`);
    qc.invalidateQueries({ queryKey: ["admin-trade", id] });
    qc.invalidateQueries({ queryKey: ["admin-trade-participants", id] });
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!trade) return <div className="text-center py-12 text-muted-foreground">Trade not found</div>;

  const allowedTransitions = TRANSITIONS[trade.status] ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <button onClick={() => navigate("/admin/trades")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Trade Engine
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">{trade.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColor(trade.status)}`}>{trade.status}</span>
            <span className="text-xs text-muted-foreground font-mono">{trade.id.slice(0, 12)}...</span>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Investors", value: stats.investors, icon: Users, accent: "text-primary" },
          { label: "Capital Invested", value: `$${stats.totalCapital.toLocaleString()}`, icon: DollarSign, accent: "text-success" },
          { label: "Expected Payout", value: `$${stats.expectedPayout.toLocaleString()}`, icon: DollarSign, accent: "text-warning" },
          { label: "Time Remaining", value: stats.timeRemaining, icon: Clock, accent: "text-muted-foreground" },
        ].map((k) => (
          <div key={k.label} className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><k.icon className={`w-3.5 h-3.5 ${k.accent}`} />{k.label}</div>
            <p className={`font-display font-bold text-lg ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Capital allocation bar */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground">Capital Allocation</span>
          <span className="text-xs font-semibold">${stats.totalCapital.toLocaleString()} / ${maxCap.toLocaleString()} ({capPercent.toFixed(0)}%)</span>
        </div>
        <Progress value={capPercent} className="h-2" />
      </div>

      {/* Trade Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trade Info */}
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-display font-semibold text-sm">Trade Configuration</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["ROI", `${Number(trade.roi_percent)}%`],
              ["Duration", `${Number(trade.duration_hours)}h`],
              ["Min Investment", `$${Number(trade.min_investment)}`],
              ["Max Investment", `$${Number(trade.max_investment).toLocaleString()}`],
              ["Slot Limit", `${trade.slot_limit}`],
              ["Slots Filled", `${trade.slots_filled}`],
              ["Risk Tier", trade.risk_level],
              ["Strategy", (trade as any).strategy_type ?? "arbitrage"],
              ["Settlement", (trade as any).settlement_mode ?? "auto"],
              ["Auto-Close", (trade as any).auto_close ? "Yes" : "No"],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-xs text-muted-foreground">{label}</span>
                <p className="font-medium">{val}</p>
              </div>
            ))}
          </div>
          {(trade as any).description && (
            <div>
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="text-sm mt-0.5">{(trade as any).description}</p>
            </div>
          )}
        </div>

        {/* Lifecycle Controls */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Lifecycle Control</h3>
          {allowedTransitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transitions available. Trade is {trade.status}.</p>
          ) : (
            <div className="space-y-2">
              {allowedTransitions.map((next) => {
                const isDanger = next === "cancelled" || next === "settled";
                return (
                  <div key={next}>
                    {confirmAction === next ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <span className="text-xs flex-1">
                          {next === "settled" ? "Settlement will calculate profits and create ledger entries. This cannot be undone." :
                           next === "cancelled" ? "All active participants will be refunded. This cannot be undone." :
                           `Confirm transition to "${next}"?`}
                        </span>
                        <button onClick={() => handleTransition(next)} className="px-3 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Confirm
                        </button>
                        <button onClick={() => setConfirmAction(null)} className="px-3 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => isDanger ? setConfirmAction(next) : handleTransition(next)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isDanger
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isDanger ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span className="capitalize">{next === "active" ? "Open Trade" : next === "running" ? "Set Running" : next === "closed" ? "Close Trade" : next === "settled" ? "Settle Trade" : "Cancel Trade"}</span>
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">Participants ({participants?.length ?? 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["User", "Amount", "Entry Time", "Profit", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants?.map((p) => (
                <tr key={p.id} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{profiles?.[p.user_id] ?? "Unknown"}</span>
                    <div className="text-[10px] text-muted-foreground font-mono">{p.user_id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-2.5 font-semibold">${Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(p.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-success font-semibold">{p.profit != null ? `$${Number(p.profit).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      p.status === "completed" ? "bg-success/10 text-success" :
                      p.status === "refunded" ? "bg-warning/10 text-warning" :
                      "bg-primary/10 text-primary"
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {(!participants || participants.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No participants yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
