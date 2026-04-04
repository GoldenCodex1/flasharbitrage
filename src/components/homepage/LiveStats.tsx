import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, TrendingUp, CheckCircle } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  total_users: Users,
  total_profit_paid: DollarSign,
  active_trades: TrendingUp,
  success_rate: CheckCircle,
};

interface Stat {
  key: string;
  value: string;
  label: string;
}

function AnimatedNumber({ target, suffix = "" }: { target: string; suffix?: string }) {
  const num = parseFloat(target.replace(/[^0-9.]/g, ""));
  const prefix = target.match(/^[^0-9]*/)?.[0] || "";
  const detectedSuffix = target.match(/[^0-9.]*$/)?.[0] || suffix;
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (isNaN(num)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const duration = 2000;
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(eased * num);
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [num]);

  if (isNaN(num)) return <span>{target}</span>;

  const formatted = num >= 1000
    ? display.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : display.toFixed(num % 1 !== 0 ? 1 : 0);

  return <span ref={ref}>{prefix}{formatted}{detectedSuffix}</span>;
}

export default function LiveStats() {
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    supabase
      .from("platform_stats")
      .select("key, value, label")
      .then(({ data }) => {
        if (data) setStats(data);
      });
  }, []);

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Platform Performance</h2>
          <p className="text-muted-foreground">Real-time stats powered by live data.</p>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = iconMap[stat.key] || TrendingUp;
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center hover:border-primary/20 hover:-translate-y-1 transition-all duration-300"
              >
                <Icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <p className="font-display text-2xl sm:text-3xl font-bold mb-1">
                  <AnimatedNumber target={stat.value} />
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
