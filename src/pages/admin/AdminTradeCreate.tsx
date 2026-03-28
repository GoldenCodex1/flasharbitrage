import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FIELD_CLASS = "bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground w-full";

const EXCHANGE_SUGGESTIONS = ["Binance", "Coinbase", "Kraken", "KuCoin", "Bybit", "OKX", "Gate.io", "HTX", "Bitfinex", "MEXC"];
const PAIR_SUGGESTIONS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "DOT/USDT", "MATIC/USDT", "LINK/USDT", "UNI/USDT"];

export default function AdminTradeCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    trading_pair: "BTC/USDT",
    strategy_type: "arbitrage",
    roi_percent: "",
    duration_hours: "",
    min_investment: "",
    max_investment: "",
    capital_cap: "",
    slot_limit: "20",
    risk_level: "Low",
    auto_close: false,
    settlement_mode: "auto",
    description: "",
    buy_exchange: "Binance",
    sell_exchange: "Coinbase",
  });

  const set = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));

  // Auto-generate title from trading pair + strategy
  const autoTitle = form.trading_pair
    ? `${form.trading_pair} ${form.strategy_type.charAt(0).toUpperCase() + form.strategy_type.slice(1)} Sprint`
    : "";

  const handleCreate = async () => {
    if (!form.trading_pair || !form.roi_percent || !form.duration_hours || !form.min_investment || !form.max_investment) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const finalTitle = form.title || autoTitle;
    const { error } = await supabase.from("trades").insert({
      title: finalTitle,
      trading_pair: form.trading_pair,
      strategy_type: form.strategy_type,
      roi_percent: Number(form.roi_percent),
      duration_hours: Number(form.duration_hours),
      min_investment: Number(form.min_investment),
      max_investment: Number(form.max_investment),
      capital_cap: form.capital_cap ? Number(form.capital_cap) : null,
      slot_limit: Number(form.slot_limit),
      risk_level: form.risk_level,
      auto_close: form.auto_close,
      settlement_mode: form.settlement_mode,
      description: form.description || null,
      buy_exchange: form.buy_exchange,
      sell_exchange: form.sell_exchange,
      created_by: user?.id ?? null,
      status: "draft",
    } as any);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Trade created as Draft");
      navigate("/admin/trades");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      <button onClick={() => navigate("/admin/trades")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Trade Engine
      </button>

      <h1 className="font-display font-bold text-xl sm:text-2xl">Create Trade Opportunity</h1>

      <div className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Trading Pair */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trading Pair *</label>
            <select value={form.trading_pair} onChange={(e) => set("trading_pair", e.target.value)} className={FIELD_CLASS}>
              {TRADING_PAIRS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Strategy Type</label>
            <select value={form.strategy_type} onChange={(e) => set("strategy_type", e.target.value)} className={FIELD_CLASS}>
              <option value="arbitrage">Arbitrage</option>
              <option value="spot">Spot</option>
              <option value="futures">Futures</option>
              <option value="defi">DeFi</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Title (auto-generated if empty)</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={FIELD_CLASS} placeholder={autoTitle} />
          </div>

          {/* Exchange Fields */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Buy Exchange *</label>
            <select value={form.buy_exchange} onChange={(e) => set("buy_exchange", e.target.value)} className={FIELD_CLASS}>
              {EXCHANGES.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sell Exchange *</label>
            <select value={form.sell_exchange} onChange={(e) => set("sell_exchange", e.target.value)} className={FIELD_CLASS}>
              {EXCHANGES.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ROI % *</label>
            <input type="number" value={form.roi_percent} onChange={(e) => set("roi_percent", e.target.value)} className={FIELD_CLASS} placeholder="e.g. 8.5" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duration (hours) *</label>
            <input type="number" value={form.duration_hours} onChange={(e) => set("duration_hours", e.target.value)} className={FIELD_CLASS} placeholder="e.g. 3" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Risk Tier</label>
            <select value={form.risk_level} onChange={(e) => set("risk_level", e.target.value)} className={FIELD_CLASS}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min Investment *</label>
            <input type="number" value={form.min_investment} onChange={(e) => set("min_investment", e.target.value)} className={FIELD_CLASS} placeholder="50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Investment *</label>
            <input type="number" value={form.max_investment} onChange={(e) => set("max_investment", e.target.value)} className={FIELD_CLASS} placeholder="5000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Capital Cap</label>
            <input type="number" value={form.capital_cap} onChange={(e) => set("capital_cap", e.target.value)} className={FIELD_CLASS} placeholder="Optional total cap" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Slot Limit</label>
            <input type="number" value={form.slot_limit} onChange={(e) => set("slot_limit", e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Settlement Mode</label>
            <select value={form.settlement_mode} onChange={(e) => set("settlement_mode", e.target.value)} className={FIELD_CLASS}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="flex items-center gap-2 self-end pb-1">
            <input type="checkbox" id="auto_close" checked={form.auto_close} onChange={(e) => set("auto_close", e.target.checked)} className="rounded" />
            <label htmlFor="auto_close" className="text-sm">Auto-close at capital cap</label>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={FIELD_CLASS} placeholder="Trade strategy details..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleCreate} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Creating..." : "Create as Draft"}
          </button>
          <button onClick={() => navigate("/admin/trades")} className="px-6 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}
