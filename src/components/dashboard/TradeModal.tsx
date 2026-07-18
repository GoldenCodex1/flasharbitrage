import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, Clock, TrendingUp, DollarSign } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  trade: Tables<"trades"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
}

export default function TradeModal({ trade, open, onOpenChange, balance }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!trade) return null;

  const t = trade as any;
  const minAmount = Number(trade.min_investment);
  const maxAmount = Number(trade.max_investment);
  const numAmount = Number(amount);
  const isValid = numAmount >= minAmount && numAmount <= maxAmount && numAmount <= balance && numAmount > 0;

  const handleJoin = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_trade", {
        _user_id: user.id,
        _trade_id: trade.id,
        _amount: numAmount,
        _source: "manual",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const result = data as any;
      if (result && !result.success) {
        toast.error(result.error || "Failed to join trade");
        return;
      }

      toast.success(`Joined ${t.trading_pair ?? trade.title} with $${numAmount.toLocaleString()}`);
      queryClient.invalidateQueries({ queryKey: ["active-trade-entries"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-trades"] });
      queryClient.invalidateQueries({ queryKey: ["trades-today-count"] });
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
      setAmount("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Join Trade
          </DialogTitle>
          <DialogDescription>Review trade details and enter your investment amount.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trade Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg px-3 py-2">
              <span className="text-[10px] text-muted-foreground block">Pair</span>
              <span className="text-sm font-semibold">{t.trading_pair ?? "BTC/USDT"}</span>
            </div>
            <div className="bg-secondary/50 rounded-lg px-3 py-2">
              <span className="text-[10px] text-muted-foreground block">Strategy</span>
              <span className="text-sm font-semibold capitalize">{t.strategy_type ?? "arbitrage"}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span className="text-muted-foreground">ROI:</span>
              <span className="font-semibold text-success">+{Number(trade.roi_percent)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold">{Number(trade.duration_hours)}h</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Min:</span>
              <span className="font-semibold">${minAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="font-display font-bold text-lg">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Enter Amount to Trade</label>
            <Input
              type="number"
              placeholder={`Min $${minAmount.toLocaleString()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minAmount}
              max={Math.min(maxAmount, balance)}
              step="0.01"
            />
            {amount && numAmount > 0 && (
              <div className="text-xs space-y-0.5">
                {numAmount < minAmount && <p className="text-destructive">Minimum amount is ${minAmount.toLocaleString()}</p>}
                {numAmount > maxAmount && <p className="text-destructive">Maximum amount is ${maxAmount.toLocaleString()}</p>}
                {numAmount > balance && <p className="text-destructive">Insufficient balance</p>}
                {isValid && (
                  <p className="text-success">
                    Estimated return: ${(numAmount + numAmount * Number(trade.roi_percent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+${(numAmount * Number(trade.roi_percent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} profit)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleJoin} disabled={!isValid || loading}>
            {loading ? "Joining..." : "Confirm Trade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
