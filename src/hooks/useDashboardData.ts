import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDashboardData() {
  const { user } = useAuth();

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: activeTradeEntries } = useQuery({
    queryKey: ["active-trade-entries", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_entries")
        .select("*, trades(*)")
        .eq("user_id", user!.id)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["pending-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: botActivity } = useQuery({
    queryKey: ["bot-activity", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_activity")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: suggestedTrades } = useQuery({
    queryKey: ["suggested-trades"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalBalance = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const totalProfit = transactions
    ?.filter((t) => t.type === "profit" || t.type === "trade_profit")
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const pendingWithdrawalTotal = pendingWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) ?? 0;
  const referralEarnings = referrals?.reduce((sum, r) => sum + Number(r.total_commission), 0) ?? 0;

  return {
    totalBalance,
    activeTradeCount: activeTradeEntries?.length ?? 0,
    totalProfit,
    pendingWithdrawalTotal,
    suggestedTradeCount: suggestedTrades?.length ?? 0,
    referralEarnings,
    referralCount: referrals?.length ?? 0,
    botActivity,
    suggestedTrades: suggestedTrades ?? [],
    activeTradeEntries: activeTradeEntries ?? [],
    recentTransactions: transactions?.slice(0, 10) ?? [],
  };
}
