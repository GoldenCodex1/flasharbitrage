import { motion } from "framer-motion";
import { Briefcase, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Portfolio() {
  const { user } = useAuth();

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: activeEntries } = useQuery({
    queryKey: ["active-trade-entries", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("*, trades(*)").eq("user_id", user!.id).eq("status", "active");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: completedEntries } = useQuery({
    queryKey: ["completed-trade-entries", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("*, trades(*)").eq("user_id", user!.id).eq("status", "completed");
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalBalance = transactions?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const totalInvested = [...(activeEntries ?? []), ...(completedEntries ?? [])].reduce((s, e) => s + Number(e.amount), 0);
  const totalProfit = (completedEntries ?? []).reduce((s, e) => s + Number(e.profit ?? 0), 0);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Portfolio</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Value" value={fmt(totalBalance)} icon={Briefcase} />
        <MetricCard label="Total Invested" value={fmt(totalInvested)} icon={DollarSign} />
        <MetricCard label="Total Profit" value={fmt(totalProfit)} icon={TrendingUp} trend={totalProfit > 0 ? `+${((totalProfit / Math.max(totalInvested, 1)) * 100).toFixed(1)}%` : undefined} positive={totalProfit > 0} />
        <MetricCard label="Active Trades" value={String(activeEntries?.length ?? 0)} icon={BarChart3} />
      </div>

      {(activeEntries?.length ?? 0) > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h3 className="font-display font-semibold text-sm">Active Positions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Expected ROI</th>
                </tr>
              </thead>
              <tbody>
                {activeEntries?.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-display font-semibold">{e.trades?.title ?? "—"}</td>
                    <td className="px-4 py-3">{fmt(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-success font-semibold">{e.trades?.roi_percent ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
