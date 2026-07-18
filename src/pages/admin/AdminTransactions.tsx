import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function AdminTransactions() {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: transactions } = useQuery({
    queryKey: ["admin-transactions", typeFilter],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const types = ["all", "deposit", "withdrawal", "trade_profit", "trade_entry", "referral_commission"];
  const fmt = (n: number) => (n >= 0 ? "+" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Transactions</h1>

      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {t === "all" ? "All" : t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions && transactions.length > 0 ? transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{tx.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary">{tx.type.replace(/_/g, " ")}</span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${Number(tx.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                    {fmt(Number(tx.amount))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{tx.description ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
