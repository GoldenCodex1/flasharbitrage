import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Clock, Loader2, RefreshCw, QrCode, AlertCircle, CheckCircle2, ArrowDownCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentData: {
    payment_id: string;
    pay_address: string;
    pay_amount: number;
    pay_currency: string;
    network: string;
    price_amount: number;
    expiration_estimate_date?: string;
  } | null;
}

type PaymentStatus = "waiting" | "confirming" | "confirmed" | "sending" | "partially_paid" | "finished" | "failed" | "refunded" | "expired";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  waiting: { label: "Waiting for payment", icon: Clock, color: "text-yellow-400" },
  confirming: { label: "Payment detected — confirming", icon: Loader2, color: "text-blue-400" },
  confirmed: { label: "Payment confirmed", icon: CheckCircle2, color: "text-green-400" },
  sending: { label: "Processing...", icon: Loader2, color: "text-blue-400" },
  partially_paid: { label: "Partial payment received", icon: AlertCircle, color: "text-orange-400" },
  finished: { label: "Payment completed!", icon: CheckCircle2, color: "text-green-400" },
  failed: { label: "Payment failed", icon: AlertCircle, color: "text-red-400" },
  refunded: { label: "Payment refunded", icon: AlertCircle, color: "text-red-400" },
  expired: { label: "Payment expired", icon: AlertCircle, color: "text-red-400" },
};

const PAYMENT_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes

export default function PaymentModal({ open, onClose, paymentData }: PaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("waiting");
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT_MS);
  const [startTime] = useState(Date.now());

  const isTerminal = ["finished", "confirmed", "failed", "refunded", "expired"].includes(status);

  // Poll payment status
  const checkStatus = useCallback(async () => {
    if (!paymentData || isTerminal) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-payment-status", {
        body: { payment_id: paymentData.payment_id },
      });
      if (!error && data?.payment_status) {
        setStatus(data.payment_status as PaymentStatus);
        if (data.payment_status === "finished" || data.payment_status === "confirmed") {
          toast.success("Payment confirmed! Your balance will be credited shortly.");
        }
      }
    } catch {
      // silent
    }
  }, [paymentData, isTerminal]);

  useEffect(() => {
    if (!open || !paymentData || isTerminal) return;
    const interval = setInterval(checkStatus, 10000); // every 10s
    return () => clearInterval(interval);
  }, [open, paymentData, checkStatus, isTerminal]);

  // Timer countdown
  useEffect(() => {
    if (!open || isTerminal) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = PAYMENT_TIMEOUT_MS - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        setStatus("expired");
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [open, startTime, isTerminal]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!paymentData) return null;

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const StatusIcon = statusCfg.icon;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={isTerminal ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-card p-6 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Complete Payment</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Status */}
            <div className={`flex items-center gap-2 p-3 rounded-lg bg-secondary/50 ${statusCfg.color}`}>
              <StatusIcon className={`w-5 h-5 ${status === "confirming" || status === "sending" ? "animate-spin" : ""}`} />
              <span className="text-sm font-semibold">{statusCfg.label}</span>
            </div>

            {/* Timer */}
            {!isTerminal && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatTime(timeLeft)} remaining</span>
              </div>
            )}

            {/* Payment details */}
            {!isTerminal && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Send EXACT amount</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-secondary/50 px-3 py-2.5 rounded-lg text-lg font-bold font-mono text-foreground">
                      {paymentData.pay_amount} {paymentData.pay_currency.toUpperCase()}
                    </code>
                    <button
                      onClick={() => handleCopy(String(paymentData.pay_amount), "amount")}
                      className="p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      {copiedField === "amount" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To this {paymentData.pay_currency.toUpperCase()} address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-secondary/50 px-3 py-2.5 rounded-lg text-xs font-mono text-foreground break-all leading-relaxed">
                      {paymentData.pay_address}
                    </code>
                    <button
                      onClick={() => handleCopy(paymentData.pay_address, "address")}
                      className="p-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
                    >
                      {copiedField === "address" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Network: <strong className="text-foreground">{paymentData.network?.toUpperCase()}</strong></span>
                  <span>≈ ${paymentData.price_amount} USD</span>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentData.pay_address)}`}
                      alt="Payment QR Code"
                      className="w-[180px] h-[180px]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-center text-muted-foreground">
                  ⚠️ Send <strong>EXACT</strong> amount to the address above. Sending a different amount or wrong coin may result in lost funds.
                </p>
              </>
            )}

            {/* Terminal states */}
            {status === "finished" || status === "confirmed" ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-sm text-muted-foreground">Your balance has been credited.</p>
                <button onClick={onClose} className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Done
                </button>
              </div>
            ) : status === "expired" || status === "failed" ? (
              <div className="text-center space-y-3 py-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {status === "expired" ? "This payment has expired." : "Payment failed."}
                </p>
                <button onClick={onClose} className="w-full py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Create New Deposit
                </button>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
