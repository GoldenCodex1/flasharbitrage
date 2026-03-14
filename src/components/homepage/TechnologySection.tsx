import { motion } from "framer-motion";
import { Brain, ShieldCheck, Cpu, Globe } from "lucide-react";
import { useHomepageSection } from "@/hooks/useHomepageSection";
import type { ElementType } from "react";

const iconMap: Record<string, ElementType> = { Brain, ShieldCheck, Cpu, Globe };

const defaults = {
  title: "Arbitrage Technology",
  subtitle: "Our proprietary engine combines machine learning with proven arbitrage strategies for consistent performance.",
  items: [
    { icon: "Brain", title: "AI-Assisted Trade Matching", desc: "Advanced algorithms identify optimal arbitrage opportunities across markets." },
    { icon: "ShieldCheck", title: "Risk-Controlled Strategies", desc: "Every trade passes through multi-layer risk analysis before execution." },
    { icon: "Cpu", title: "Automated Execution Engine", desc: "Millisecond trade placement ensures you capture the best spreads." },
    { icon: "Globe", title: "Multi-Market Monitoring", desc: "Continuous scanning across exchanges for price discrepancies." },
  ],
};

export default function TechnologySection() {
  const section = useHomepageSection("technology", defaults);

  return (
    <section id="technology" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{section.title}</h2>
          <p className="text-muted-foreground mb-8">{section.subtitle}</p>
          <div className="space-y-5">
            {section.items.map((p) => {
              const Icon = iconMap[p.icon] || Cpu;
              return (
                <div key={p.title} className="flex gap-4 items-start">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm mb-0.5">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="hidden lg:block"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="glass-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Trade Engine Monitor</span>
              <span className="status-badge-success">Live</span>
            </div>
            {[
              { pair: "BTC/USDT", spread: "+0.34%", status: "Executed" },
              { pair: "ETH/USDT", spread: "+0.21%", status: "Scanning" },
              { pair: "SOL/USDT", spread: "+0.48%", status: "Executed" },
              { pair: "BNB/USDT", spread: "+0.17%", status: "Queued" },
            ].map((t) => (
              <div key={t.pair} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                <span className="font-medium">{t.pair}</span>
                <span className="text-success">{t.spread}</span>
                <span className={`text-xs ${t.status === "Executed" ? "text-success" : t.status === "Scanning" ? "text-primary" : "text-muted-foreground"}`}>{t.status}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
