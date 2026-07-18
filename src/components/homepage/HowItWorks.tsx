import { motion } from "framer-motion";
import { ArrowDownToLine, Bot, TrendingUp, Wallet } from "lucide-react";
import { useHomepageSection } from "@/hooks/useHomepageSection";
import type { ElementType } from "react";

const iconMap: Record<string, ElementType> = { ArrowDownToLine, Bot, TrendingUp, Wallet };

const defaults = {
  title: "How It Works",
  subtitle: "Get started in four simple steps and let AI handle the rest.",
  items: [
    { icon: "ArrowDownToLine", title: "Deposit Funds", desc: "Fund your account securely with crypto or manual transfer." },
    { icon: "Bot", title: "Activate Auto Arbitrage", desc: "Enable the AI-powered bot to start trading for you." },
    { icon: "TrendingUp", title: "Earn Daily ROI", desc: "Watch your portfolio grow with consistent daily returns." },
    { icon: "Wallet", title: "Withdraw Anytime", desc: "Cash out your earnings whenever you choose." },
  ],
};

export default function HowItWorks() {
  const section = useHomepageSection("how_it_works", defaults);

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{section.title}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{section.subtitle}</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {section.items.map((step, i) => {
            const Icon = iconMap[step.icon] || TrendingUp;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-6 text-center group"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground mb-2 block">Step {i + 1}</span>
                <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
