import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bot, DollarSign, TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function BotOverviewMetrics() {
  const { data: totalUsers } = useQuery({
    queryKey: ["bot-total-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: activeBots } = useQuery({
    queryKey: ["bot-active-bots"],
    queryFn: async () => {
      const { count } = await supabase.from("bot_activity").select("*", { count: "exact", head: true }).eq("bot_enabled", true);
      return count ?? 0;
    },
  });

  const { data: exposure } = useQuery({
    queryKey: ["bot-platform-exposure"],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("amount").eq("status", "active");
      return data?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
    },
  });

  const { data: todayStats } = useQuery({
    queryKey: ["bot-today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("trade_entries").select("profit, status").gte("completed_at", today.toISOString()).eq("status", "completed");
      const profit = data?.filter(t => Number(t.profit) > 0).reduce((s, t) => s + Number(t.profit), 0) ?? 0;
      const loss = Math.abs(data?.filter(t => Number(t.profit) < 0).reduce((s, t) => s + Number(t.profit), 0) ?? 0);
      const wins = data?.filter(t => Number(t.profit) > 0).length ?? 0;
      const total = data?.length ?? 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
      const avgRoi = total > 0 ? ((profit - loss) / Math.max(1, total)).toFixed(2) : "0.00";
      return { profit, loss, winRate, avgRoi, total };
    },
  });

  const metrics = [
    { label: "Total Users", value: String(totalUsers ?? 0), icon: Users, color: "text-primary" },
    { label: "Active Bots", value: String(activeBots ?? 0), icon: Bot, color: "text-success" },
    { label: "Platform Exposure", value: fmt(exposure ?? 0), icon: DollarSign, color: "text-warning" },
    { label: "Today's Profit", value: fmt(todayStats?.profit ?? 0), icon: TrendingUp, color: "text-success" },
    { label: "Today's Loss", value: fmt(todayStats?.loss ?? 0), icon: TrendingDown, color: "text-destructive" },
    { label: "Win Rate", value: `${todayStats?.winRate ?? "0.0"}%`, icon: Target, color: "text-primary" },
    { label: "Avg ROI", value: `$${todayStats?.avgRoi ?? "0.00"}`, icon: BarChart3, color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <m.icon className={`w-4 h-4 ${m.color}`} />
          </div>
          <span className="text-lg font-display font-bold text-foreground">{m.value}</span>
        </div>
      ))}
    </div>
  );
}
