import { Clock, TrendingUp, Users, Zap, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import TradeModal from "./TradeModal";

const riskColor: Record<string, string> = {
  Low: "status-badge-success",
  Medium: "status-badge-warning",
  High: "status-badge-danger",
};

interface Props {
  trades: Tables<"trades">[];
  balance?: number;
}

const MAX_VISIBLE = 5;

export default function SuggestedTrades({ trades, balance = 0 }: Props) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState<Tables<"trades"> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const totalPages = Math.ceil(trades.length / MAX_VISIBLE);
  const visible = trades.slice(page * MAX_VISIBLE, (page + 1) * MAX_VISIBLE);

  if (trades.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No active trade opportunities right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={scrollRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((trade) => {
          const t = trade as any;
          const remainingSlots = trade.slot_limit - trade.slots_filled;
          const timeLeft = trade.expires_at
            ? getTimeLeft(trade.expires_at)
            : `${trade.duration_hours}h`;
          const tradingPair = t.trading_pair ?? "BTC/USDT";
          const buyExchange = t.buy_exchange ?? "Binance";
          const sellExchange = t.sell_exchange ?? "Coinbase";
          const minInvestment = Number(trade.min_investment);
          const insufficientBalance = balance < minInvestment;

          return (
            <div key={trade.id} className="glass-card-hover p-5 flex flex-col gap-3">
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

              <div className="bg-success/8 border border-success/20 rounded-lg px-3 py-2 text-center">
                <span className="text-xs text-muted-foreground">Expected ROI</span>
                <p className="text-success font-display font-bold text-lg">+{Number(trade.roi_percent)}%</p>
              </div>

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

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">
                  Min: <span className="text-foreground font-medium">${minInvestment.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{Number(trade.duration_hours)}h duration</span>
                </div>
              </div>

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
                  onClick={() => { setSelectedTrade(trade); setModalOpen(true); }}
                  disabled={remainingSlots <= 0 || insufficientBalance}
                  title={insufficientBalance ? "Insufficient balance" : undefined}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {insufficientBalance ? "Low Balance" : "Trade Now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <TradeModal
        trade={selectedTrade}
        open={modalOpen}
        onOpenChange={setModalOpen}
        balance={balance}
      />
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
