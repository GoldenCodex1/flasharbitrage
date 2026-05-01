import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Copy, CheckCircle2, Clock, ExternalLink, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function shortAddr(a?: string | null) {
  if (!a) return "—";
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

function CopyableMono({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`group inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary transition-colors ${className}`}
      title="Click to copy"
    >
      <span className="break-all">{value}</span>
      {copied ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
    </button>
  );
}

export default function TransactionDetail() {
  const { transaction_ref } = useParams<{ transaction_ref: string }>();
  const { user } = useAuth();
  const [refTooltip, setRefTooltip] = useState(false);

  const { data: entry, isLoading } = useQuery({
    queryKey: ["tx", transaction_ref, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_entries")
        .select("*, trades(*)")
        .eq("transaction_ref", transaction_ref!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!transaction_ref && !!user,
  });

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12 text-sm">Loading transaction…</div>;
  }
  if (!entry) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Transaction not found.</p>
        <Link to="/transactions" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to transactions
        </Link>
      </div>
    );
  }

  const trade = entry.trades;
  const amount = Number(entry.amount);
  const roi = trade ? Number(trade.roi_percent) : 0;
  const profit = Number(entry.profit ?? amount * (roi / 100));
  const durationMs = (trade ? Number(trade.duration_hours) : 1) * 3600 * 1000;
  const startMs = new Date(entry.started_at).getTime();
  const endMs = entry.completed_at ? new Date(entry.completed_at).getTime() : startMs + durationMs;
  const now = Date.now();
  const progress = Math.max(0, Math.min(100, ((Math.min(now, endMs) - startMs) / durationMs) * 100));
  const isDone = entry.status === "completed" || entry.status === "settled";

  const steps = [
    {
      from: entry.from_address,
      to: entry.mid_address,
      label: "Funds moved",
      done: progress > 5,
    },
    {
      from: entry.mid_address,
      to: entry.intermediate_address,
      label: "Trade executed",
      done: progress > 50,
    },
    {
      from: entry.intermediate_address,
      to: entry.final_address,
      label: "Funds returned",
      done: isDone,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/transactions" className="text-muted-foreground text-sm hover:text-primary inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <span className={`status-badge-${isDone ? "success" : "info"}`}>{isDone ? "Completed" : "In progress"}</span>
      </div>

      {/* Header */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground">Transaction Reference</div>
            <div className="relative inline-block">
              <button
                onMouseEnter={() => setRefTooltip(true)}
                onMouseLeave={() => setRefTooltip(false)}
                onClick={() => {
                  navigator.clipboard.writeText(entry.transaction_ref);
                  toast.success("Reference copied");
                }}
                className="font-mono text-sm md:text-base text-primary break-all text-left hover:opacity-80"
              >
                {entry.transaction_ref}
              </button>
              {refTooltip && (
                <div className="absolute left-0 -bottom-8 z-10 px-2 py-1 text-[10px] bg-secondary border border-border/50 rounded whitespace-nowrap">
                  This is an internal transaction reference
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Trading Pair</div>
            <div className="font-display font-bold">{trade?.trading_pair ?? trade?.title ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-3">
          <div className="text-[10px] text-muted-foreground uppercase">Amount</div>
          <div className="font-display font-bold">${amount.toLocaleString()}</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-[10px] text-muted-foreground uppercase">ROI</div>
          <div className="font-display font-bold text-success">+{roi}%</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-[10px] text-muted-foreground uppercase">Profit</div>
          <div className="font-display font-bold text-success">+${profit.toFixed(2)}</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-[10px] text-muted-foreground uppercase">Status</div>
          <div className="font-display font-bold capitalize">{entry.status}</div>
        </div>
      </div>

      {/* Times + progress */}
      <div className="glass-card p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Start</div>
            <div className="font-medium">{format(new Date(entry.started_at), "MMM d, yyyy HH:mm")}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">End</div>
            <div className="font-medium">{entry.completed_at ? format(new Date(entry.completed_at), "MMM d, yyyy HH:mm") : format(new Date(endMs), "MMM d, yyyy HH:mm")}</div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-success"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      {/* Wallet flow */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" /> Wallet Flow
        </h3>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border border-border/30 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`text-xs font-medium ${s.done ? "text-success" : "text-primary"}`}>Step {i + 1}: {s.label}</span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {s.done ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Clock className="w-3 h-3 animate-pulse" />}
                  <span>{s.done ? "Confirmed" : "Pending"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <CopyableMono value={s.from || ""} className="text-muted-foreground" />
                <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                <CopyableMono value={s.to || ""} className="text-muted-foreground" />
              </div>
            </motion.div>
          ))}
          <div className="text-center text-[11px] text-success font-medium pt-1">
            ↳ Final destination: User Wallet
          </div>
        </div>
      </div>
    </motion.div>
  );
}
