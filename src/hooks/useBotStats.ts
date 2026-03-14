import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Computes live bot stats from trade_entries (source of truth)
 * instead of relying on potentially stale bot_activity counters.
 */
export function useBotStats() {
  const { user } = useAuth();

  const { data: todayStats } = useQuery({
    queryKey: ["bot-today-stats-live", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's completed trades for this user
      const { data: completedToday } = await supabase
        .from("trade_entries")
        .select("profit, amount")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .gte("completed_at", today.toISOString());

      // Get today's started trades count (active + completed)
      const { count: tradesTodayCount } = await supabase
        .from("trade_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("started_at", today.toISOString());

      const profits = completedToday
        ?.filter((t) => Number(t.profit) > 0)
        .reduce((s, t) => s + Number(t.profit), 0) ?? 0;

      const losses = Math.abs(
        completedToday
          ?.filter((t) => Number(t.profit) < 0)
          .reduce((s, t) => s + Number(t.profit), 0) ?? 0
      );

      return {
        profitToday: profits,
        lossToday: losses,
        tradesToday: tradesTodayCount ?? 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return {
    profitToday: todayStats?.profitToday ?? 0,
    lossToday: todayStats?.lossToday ?? 0,
    tradesToday: todayStats?.tradesToday ?? 0,
  };
}
