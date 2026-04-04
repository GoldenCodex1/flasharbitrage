import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Bot, BarChart3, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SystemStatusBar from "./SystemStatusBar";

interface HeroData {
  headline: string;
  subheadline: string;
  primary_cta_text: string;
  secondary_cta_text: string;
}

const defaults: HeroData = {
  headline: "Smart Arbitrage.",
  subheadline: "FlashArbitrage combines AI-assisted arbitrage strategies with automated execution to generate consistent ROI.",
  primary_cta_text: "Get Started",
  secondary_cta_text: "Login",
};

export default function HeroSection() {
  const [hero, setHero] = useState<HeroData>(defaults);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);

  useEffect(() => {
    supabase.from("homepage_hero").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setHero(data);
    });
  }, []);

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* Parallax background glow */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center relative">
        {/* Left */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {hero.headline.includes(".") ? (
              <>
                {hero.headline.split(".")[0]}.{" "}
                <span className="gradient-text">{hero.headline.split(".").slice(1).join(".").trim()}</span>
              </>
            ) : (
              <span className="gradient-text">{hero.headline}</span>
            )}
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed mb-6 max-w-lg">
            {hero.subheadline}
          </p>

          <SystemStatusBar />

          <div className="flex flex-wrap gap-4 mt-6">
            <Button size="lg" asChild className="gap-2 rounded-2xl px-8 relative overflow-hidden group">
              <Link to="/auth">
                {hero.primary_cta_text}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span className="absolute inset-0 bg-primary/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-2xl px-8 hover:scale-105 transition-transform">
              <Link to="/auth">{hero.secondary_cta_text}</Link>
            </Button>
          </div>
        </motion.div>

        {/* Right - Mock Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="glass-card p-6 space-y-4 hover:border-primary/20 transition-colors duration-500"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Portfolio Balance</span>
              <span className="status-badge-success text-xs">Live</span>
            </div>
            <p className="font-display text-3xl font-bold">$24,831.47</p>
            <p className="text-sm text-success flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12.4% this week
            </p>
            <div className="glow-line my-3" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Bot, label: "Auto Bot", value: "Active", color: "text-success" },
                { icon: BarChart3, label: "Daily P/L", value: "+$342.18", color: "text-success" },
                { icon: TrendingUp, label: "Active Trades", value: "7", color: "text-foreground" },
                { icon: Wallet, label: "Withdrawable", value: "$18,420", color: "text-foreground" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="glass-card p-3 flex items-center gap-2 hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <item.icon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className={`text-xs font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
