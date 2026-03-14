import { Clock, TrendingUp, Users, Zap, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUserPlan } from "@/hooks/useUserPlan";
import type { Tables } from "@/integrations/supabase/types";

const riskColor: Record<string, string> = {
  Low: "status-badge-success",
  Medium: "status-badge-warning",
  High: "status-badge-danger",
};

interface Props {
  trades: Tables<"trades">[];
}

export default function SuggestedTrades({ trades }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plan, canTrade } = useUserPlan();

  const joinTrade = async (trade: Tables<"trades">) => {
    if (!user) return;

    if (plan && !canTrade) {
      toast.error("You have reached your daily trade limit for your current plan.");
      return;
    }
    if (plan && Number(trade.min_investment) > Number(plan.max_trade_amount)) {
      toast.error(`Trade amount exceeds your plan limit of $${Number(plan.max_trade_amount).toLocaleString()}.`);
      return;
    }

    const { error } = await supabase.from("trade_entries").insert({
      trade_id: trade.id,
      user_id: user.id,
      amount: Number(trade.min_investment),
    });
    if (error) {
      toast.error(error.message);
    } else {
      // Update bot_activity trades_today
      await supabase.from("bot_activity").update({
        trades_today: (await supabase.from("bot_activity").select("trades_today").eq("user_id", user.id).single()).data?.trades_today ?? 0 + 1,
      }).eq("user_id", user.id);

      toast.success(`Joined ${(trade as any).trading_pair ?? trade.title}`);
      queryClient.invalidateQueries({ queryKey: ["active-trade-entries"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-trades"] });
      queryClient.invalidateQueries({ queryKey: ["trades-today-count"] });
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
    }
  };

  if (trades.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No active trade opportunities right now.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {trades.map((trade) => {
        const t = trade as any;
        const remainingSlots = trade.slot_limit - trade.slots_filled;
        const timeLeft = trade.expires_at
          ? getTimeLeft(trade.expires_at)
          : `${trade.duration_hours}h`;
        const tradingPair = t.trading_pair ?? "BTC/USDT";
        const buyExchange = t.buy_exchange ?? "Binance";
        const sellExchange = t.sell_exchange ?? "Coinbase";

        return (
          <div key={trade.id} className="glass-card-hover p-5 flex flex-col gap-3">
            {/* Header: Trading Pair + Risk Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm">{tradingPair}</h3>
                  <span className="text-[10px] text-muted-foreground capitalize">{t.strategy_type ?? "arbitrage"}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={riskColor[trade.risk_level] || "status-badge-info"}>{trade.risk_level}</span>
                <span className="text-[10px] text-success font-medium">● Available</span>
              </div>
            </div>

            {/* ROI Highlight */}
            <div className="bg-success/8 border border-success/20 rounded-lg px-3 py-2 text-center">
              <span className="text-xs text-muted-foreground">Expected ROI</span>
              <p className="text-success font-display font-bold text-lg">+{Number(trade.roi_percent)}%</p>
            </div>

            {/* Exchange Info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/50 rounded-lg px-3 py-2">
                <span className="text-[10px] text-muted-foreground block">Buy Exchange</span>
                <span className="text-xs font-semibold text-foreground">{buyExchange}</span>
              </div>
              <div className="bg-secondary/50 rounded-lg px-3 py-2">
                <span className="text-[10px] text-muted-foreground block">Sell Exchange</span>
                <span className="text-xs font-semibold text-foreground">{sellExchange}</span>
              </div>
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">
                Min: <span className="text-foreground font-medium">${Number(trade.min_investment).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{Number(trade.duration_hours)}h duration</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {remainingSlots} slots
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {timeLeft}
                </span>
              </div>
              <button
                onClick={() => joinTrade(trade)}
                disabled={remainingSlots <= 0}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Trade Now
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
