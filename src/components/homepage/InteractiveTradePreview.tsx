import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calculator, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_TRADES = [
  { pair: "BTC/USDT", roi: 2.4, spread: "+0.34%", exchange: "Binance → Coinbase", risk: "Low" },
  { pair: "ETH/USDT", roi: 1.8, spread: "+0.21%", exchange: "Kraken → Binance", risk: "Low" },
  { pair: "SOL/USDT", roi: 3.1, spread: "+0.48%", exchange: "OKX → Bybit", risk: "Medium" },
];

export default function InteractiveTradePreview() {
  const [selected, setSelected] = useState<number | null>(null);
  const [simAmount, setSimAmount] = useState(1000);

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Live Trade <span className="gradient-text">Opportunities</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Click a trade to simulate your potential earnings.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {MOCK_TRADES.map((trade, i) => (
            <motion.div
              key={trade.pair}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(i)}
              className={`glass-card p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                selected === i ? "border-primary/50 shadow-[0_0_20px_hsl(217_91%_60%/0.15)]" : "hover:border-primary/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold">{trade.pair}</span>
                <span className="status-badge-success text-xs">{trade.risk}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROI</span>
                  <span className="text-success font-semibold">{trade.roi}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spread</span>
                  <span className="text-success">{trade.spread}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="text-foreground text-xs">{trade.exchange}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 max-w-md mx-auto"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm">Profit Simulator — {MOCK_TRADES[selected].pair}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Investment Amount ($)</label>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$100</span>
                  <span className="font-semibold text-foreground">${simAmount.toLocaleString()}</span>
                  <span>$10,000</span>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Projected Profit</span>
                </div>
                <motion.span
                  key={simAmount}
                  initial={{ scale: 1.2, color: "hsl(160, 84%, 50%)" }}
                  animate={{ scale: 1, color: "hsl(160, 84%, 39%)" }}
                  className="font-display font-bold text-lg text-success"
                >
                  +${(simAmount * MOCK_TRADES[selected].roi / 100).toFixed(2)}
                </motion.span>
              </div>
              <Button asChild className="w-full rounded-xl group">
                <a href="/auth">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trade Now
                  <span className="absolute inset-0 bg-primary/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
