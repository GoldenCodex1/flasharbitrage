import { motion } from "framer-motion";
import { Link2, ShieldCheck, HandCoins, Lock, FileSearch } from "lucide-react";
import { useHomepageSection } from "@/hooks/useHomepageSection";
import type { ElementType } from "react";

const iconMap: Record<string, ElementType> = { Link2, ShieldCheck, HandCoins, Lock, FileSearch };

const defaults = {
  title: "Enterprise-Grade Security",
  subtitle: "Your funds and data are protected by multiple layers of institutional-level security.",
  items: [
    { icon: "Link2", title: "Blockchain Verification", desc: "All transactions verified on-chain for full transparency." },
    { icon: "ShieldCheck", title: "2FA Authentication", desc: "Two-factor security on every user account." },
    { icon: "HandCoins", title: "Manual Withdrawal Approval", desc: "Admin-reviewed withdrawals prevent unauthorized access." },
    { icon: "Lock", title: "Encrypted Wallet Storage", desc: "Military-grade encryption protects all stored assets." },
    { icon: "FileSearch", title: "Admin Audit Control", desc: "Comprehensive logging of all platform activities." },
  ],
};

export default function SecuritySection() {
  const section = useHomepageSection("security", defaults);

  return (
    <section id="security" className="py-20 md:py-28 bg-card/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{section.title}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{section.subtitle}</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.items.map((item, i) => {
            const Icon = iconMap[item.icon] || ShieldCheck;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card-hover p-6"
              >
                <Icon className="w-6 h-6 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
