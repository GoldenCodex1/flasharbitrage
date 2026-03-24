import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Wallet, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Deposit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Auto deposit state
  const [autoAmount, setAutoAmount] = useState("");
  const [autoCurrency, setAutoCurrency] = useState("usdttrc20");
  const [creatingPayment, setCreatingPayment] = useState(false);

  const toggle = (method: string) => setExpandedMethod(expandedMethod === method ? null : method);

  const { data: wallets } = useQuery({
    queryKey: ["active-wallets"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: deposits } = useQuery({
    queryKey: ["my-deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Check if NOWPayments is configured using secure DB function (no RLS issues)
  const { data: autoDepositEnabled } = useQuery({
    queryKey: ["nowpayments-configured"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_auto_deposit_enabled");
      if (error) {
        console.error("Auto deposit check error:", error);
        return false;
      }
      return !!data;
    },
  });

  // Default currencies for auto deposit
  const allowedCurrencies = ["USDT", "BTC", "ETH"];

  const selectedWallet = wallets?.find((w) => w.id === selectedWalletId) ?? wallets?.[0];

  const handleCopy = () => {
    if (!selectedWallet) return;
    navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async () => {
    if (!user || !selectedWallet) return;
    if (!manualAmount || Number(manualAmount) < Number(selectedWallet.min_deposit)) {
      toast.error(`Minimum deposit is $${selectedWallet.min_deposit}`);
      return;
    }
    if (!txHash.trim()) {
      toast.error("Transaction hash is required");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user.id,
      amount: Number(manualAmount),
      method: "manual",
      currency: selectedWallet.currency,
      network: selectedWallet.network,
      tx_hash: txHash.trim(),
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        toast.error("This transaction hash has already been submitted");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Deposit submitted for verification");
      setManualAmount("");
      setTxHash("");
      queryClient.invalidateQueries({ queryKey: ["my-deposits"] });
    }
  };

  const handleAutoDeposit = async () => {
    if (!autoAmount || Number(autoAmount) <= 0) {
      toast.error("Enter a valid deposit amount");
      return;
    }
    if (Number(autoAmount) < 12) {
      toast.error("Minimum deposit amount is $12 USD");
      return;
    }

    setCreatingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { amount: Number(autoAmount), currency: autoCurrency },
      });

      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Failed to create payment");
        return;
      }

      // Redirect to NOWPayments invoice (uses location.href to avoid iOS popup blocker)
      if (data.invoice_url) {
        toast.success("Redirecting to payment page...");
        window.location.href = data.invoice_url;
      } else {
        toast.error("No payment URL received");
      }
    } catch (err: any) {
      console.error("Auto deposit error:", err);
      toast.error(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  };

  const currencyOptions: Record<string, string> = {
    USDT: "usdttrc20",
    BTC: "btc",
    ETH: "eth",
    BNB: "bnbbsc",
    SOL: "sol",
    TRX: "trx",
    MATIC: "maticpolygon",
    LTC: "ltc",
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return "status-badge-success";
      case "rejected": return "status-badge-danger";
      default: return "status-badge-warning";
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
      <h1 className="font-display font-bold text-2xl">Deposit Funds</h1>
      <p className="text-sm text-muted-foreground">Choose a deposit method below.</p>

      {/* Method 1 — NowPayments Auto */}
      {autoDepositEnabled && (
        <div className="glass-card overflow-hidden">
          <button onClick={() => toggle("auto")} className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-display font-semibold text-sm">Automatic Deposit</p>
                <p className="text-xs text-muted-foreground">Pay with crypto — instant credit on confirmation</p>
              </div>
            </div>
            {expandedMethod === "auto" ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {expandedMethod === "auto" && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-t border-border/30 p-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter the amount in USD and select your preferred cryptocurrency. You'll be redirected to a secure payment page.
              </p>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Amount (USD)</label>
                <input
                  type="number"
                  placeholder="100.00"
                  min="5"
                  value={autoAmount}
                  onChange={(e) => setAutoAmount(e.target.value)}
                  className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Pay with</label>
                <select
                  value={autoCurrency}
                  onChange={(e) => setAutoCurrency(e.target.value)}
                  className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  {(allowedCurrencies || ["USDT", "BTC", "ETH"]).map((c) => (
                    <option key={c} value={currencyOptions[c] || c.toLowerCase()}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAutoDeposit}
                disabled={creatingPayment}
                className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Pay Now
                  </>
                )}
              </button>

              <p className="text-[10px] text-muted-foreground text-center">
                You'll be redirected to NOWPayments. Your balance updates automatically once payment is confirmed.
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Method 2 — Manual */}
      <div className="glass-card overflow-hidden">
        <button onClick={() => toggle("manual")} className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold text-sm">Manual Deposit</p>
              <p className="text-xs text-muted-foreground">Send crypto directly — admin verified</p>
            </div>
          </div>
          {expandedMethod === "manual" ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>
        {expandedMethod === "manual" && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-t border-border/30 p-5 space-y-4">
            {wallets && wallets.length > 0 ? (
              <>
                {wallets.length > 1 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Select Wallet</label>
                    <select
                      className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
                      value={selectedWallet?.id ?? ""}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.currency} ({w.network})</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedWallet && (
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{selectedWallet.currency} ({selectedWallet.network})</span>
                      <span className="status-badge-info text-[10px]">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background/50 px-3 py-2 rounded-md font-mono text-foreground truncate">
                        {selectedWallet.address}
                      </code>
                      <button onClick={handleCopy} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Min deposit: ${Number(selectedWallet.min_deposit).toLocaleString()}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Amount Sent</label>
                    <input type="number" placeholder="500.00" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Transaction Hash</label>
                    <input type="text" placeholder="0x..." value={txHash} onChange={(e) => setTxHash(e.target.value)} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground" />
                  </div>
                  <button onClick={handleManualSubmit} disabled={submitting} className="w-full py-2.5 rounded-lg font-semibold text-sm bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit for Verification"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No wallets configured. Contact support.</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Deposit History */}
      {deposits && deposits.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h3 className="font-display font-semibold text-sm">Deposit History</h3>
          </div>
          <div className="divide-y divide-border/10">
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">${Number(d.amount).toLocaleString()} — {d.currency}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })} · {d.method}</p>
                </div>
                <span className={statusBadge(d.status)}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
