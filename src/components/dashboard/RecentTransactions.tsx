import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

const iconMap: Record<string, any> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  profit: TrendingUp,
  trade_profit: TrendingUp,
  trade_return: TrendingUp,
  referral: Gift,
  commission: Gift,
};

const colorMap: Record<string, string> = {
  deposit: "text-success",
  profit: "text-success",
  trade_profit: "text-success",
  trade_return: "text-success",
  withdrawal: "text-destructive",
  trade_investment: "text-destructive",
  plan_upgrade: "text-destructive",
  referral: "text-primary",
  commission: "text-primary",
};

interface Props {
  transactions: Tables<"transactions">[];
}

const MAX_VISIBLE = 5;

export default function RecentTransactions({ transactions }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(transactions.length / MAX_VISIBLE);
  const visible = transactions.slice(page * MAX_VISIBLE, (page + 1) * MAX_VISIBLE);

  if (transactions.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-border/10">
          {visible.map((tx) => {
            const Icon = iconMap[tx.type] || ArrowDownToLine;
            const color = colorMap[tx.type] || "text-foreground";
            const amount = Number(tx.amount);
            const sign = amount >= 0 ? "+" : "";

            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{tx.description || "—"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold font-display ${color}`}>
                    {sign}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
