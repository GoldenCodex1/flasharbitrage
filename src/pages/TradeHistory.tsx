import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { History, ArrowRightLeft } from "lucide-react";

export default function TradeHistory() {
  const { user } = useAuth();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["trade-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_entries")
        .select("*, trades(*)")
        .eq("user_id", user!.id)
        .in("status", ["completed", "settled"])
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
          <History className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display font-bold text-2xl">Trade History</h1>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trading Pair</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">ROI</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Profit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Started</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Settled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : entries && entries.length > 0 ? entries.map((e: any) => {
                const trade = e.trades;
                const profit = Number(e.profit ?? 0);
                const isLoss = profit < 0;
                const roiPercent = trade?.roi_percent ? Number(trade.roi_percent) : null;
                const durationHours = trade?.duration_hours ? Number(trade.duration_hours) : null;
                const tradingPair = trade?.trading_pair ?? "—";

                return (
                  <tr key={e.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium font-display">{tradingPair}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">${Number(e.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {roiPercent !== null ? (
                        <span className="text-success font-medium">+{roiPercent}%</span>
                      ) : "—"}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isLoss ? "text-destructive" : "text-success"}`}>
                      {isLoss ? "-" : "+"}${Math.abs(profit).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {durationHours !== null ? `${durationHours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(e.started_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.completed_at ? format(new Date(e.completed_at), "MMM d, yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-badge-success">Settled</span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No trade history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
