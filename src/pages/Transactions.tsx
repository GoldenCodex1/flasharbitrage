import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function Transactions() {
  const { user } = useAuth();

  const { data: transactions } = useQuery({
    queryKey: ["all-transactions", user?.id],
    queryFn: async () => {
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      const tradeRefIds = Array.from(new Set((tx ?? []).filter(t => t.reference_id && (t.type === "trade_investment" || t.type === "trade_return" || t.type === "profit")).map(t => t.reference_id))) as string[];
      let refMap: Record<string, string> = {};
      if (tradeRefIds.length && user) {
        const { data: entries } = await supabase
          .from("trade_entries")
          .select("trade_id, transaction_ref")
          .eq("user_id", user.id)
          .in("trade_id", tradeRefIds);
        (entries ?? []).forEach((e: any) => { if (e.transaction_ref) refMap[e.trade_id] = e.transaction_ref; });
      }
      return (tx ?? []).map(t => ({ ...t, _txRef: t.reference_id ? refMap[t.reference_id as string] : undefined }));
    },
    enabled: !!user,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h1 className="font-display font-bold text-2xl">Transaction History</h1>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions && transactions.length > 0 ? transactions.map((t) => {
                const amount = Number(t.amount);
                return (
                  <tr key={t.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium capitalize">{t.type.replace("_", " ")}</td>
                    <td className={`px-4 py-3 font-semibold ${amount >= 0 ? "text-success" : "text-destructive"}`}>
                      {amount >= 0 ? "+" : ""}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.description || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy HH:mm")}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
