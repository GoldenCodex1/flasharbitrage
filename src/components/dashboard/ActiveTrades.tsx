import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface TradeEntryWithTrade extends Tables<"trade_entries"> {
  trades: Tables<"trades"> | null;
}

interface Props {
  entries: TradeEntryWithTrade[];
}

const statusClass: Record<string, string> = {
  active: "status-badge-info",
  completing: "status-badge-warning",
  completed: "status-badge-success",
};

const MAX_VISIBLE = 5;

export default function ActiveTrades({ entries }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(entries.length / MAX_VISIBLE);
  const visible = entries.slice(page * MAX_VISIBLE, (page + 1) * MAX_VISIBLE);

  if (entries.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No active trades. Join a suggested trade to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Invested</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">ROI</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const roi = entry.trades ? Number(entry.trades.roi_percent) : 0;
                const expectedProfit = Number(entry.amount) * (roi / 100);
                return (
                  <tr key={entry.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium font-display">{entry.trades?.title ?? "Unknown"}</td>
                    <td className="px-4 py-3">${Number(entry.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-success font-semibold">+${expectedProfit.toFixed(2)} ({roi}%)</td>
                    <td className="px-4 py-3">
                      <span className={statusClass[entry.status] || "status-badge-pending"}>{entry.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
