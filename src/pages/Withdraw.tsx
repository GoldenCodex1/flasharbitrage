import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpFromLine } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Withdraw() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ["balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user!.id);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    },
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { plan } = useUserPlan();

  // Query 24h withdrawals for plan limit check
  const { data: recentWithdrawalTotal } = useQuery({
    queryKey: ["24h-withdrawals", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("user_id", user!.id)
        .gte("created_at", since)
        .neq("status", "rejected");
      return data?.reduce((sum, w) => sum + Number(w.amount), 0) ?? 0;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (numAmount > (balance ?? 0)) {
      toast.error("Insufficient balance");
      return;
    }
    if (!walletAddress.trim()) {
      toast.error("Enter wallet address");
      return;
    }

    // Plan withdrawal limit check
    if (plan && ((recentWithdrawalTotal ?? 0) + numAmount) > Number(plan.daily_withdrawal_limit)) {
      toast.error("You have reached the withdrawal limit for your current plan.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount: numAmount,
      currency,
      wallet_address: walletAddress.trim(),
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Withdrawal request submitted");
      setAmount("");
      setWalletAddress("");
      queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    }
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": case "completed": return "status-badge-success";
      case "rejected": return "status-badge-danger";
      default: return "status-badge-warning";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl">Withdraw Funds</h1>
      <p className="text-sm text-muted-foreground">Submit a withdrawal request. Admin approval required.</p>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <ArrowUpFromLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Available Balance</p>
            <p className="text-2xl font-display font-bold text-foreground">{fmt(balance ?? 0)}</p>
          </div>
        </div>

        <div className="glow-line" />

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
          <input type="number" placeholder="500.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground">
            <option>USDT</option>
            <option>BTC</option>
            <option>ETH</option>
            <option>BNB</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Wallet Address</label>
          <input type="text" placeholder="Enter your wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground" />
        </div>
        <button onClick={handleSubmit} disabled={submitting} className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit Withdrawal Request"}
        </button>
      </div>

      {withdrawals && withdrawals.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h3 className="font-display font-semibold text-sm">Withdrawal History</h3>
          </div>
          <div className="divide-y divide-border/10">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">${Number(w.amount).toLocaleString()} — {w.currency}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</p>
                </div>
                <span className={statusBadge(w.status)}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
