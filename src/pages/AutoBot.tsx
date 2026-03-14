import { motion } from "framer-motion";
import { Bot, Power, ShieldAlert, TrendingUp, TrendingDown, BarChart3, Timer, Settings, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useBotStats } from "@/hooks/useBotStats";
import { toast } from "sonner";

export default function AutoBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plan, canTrade, canAutoTrade, tradesToday: planTradesToday, activeAutoTrades } = useUserPlan();
  const { profitToday, lossToday, tradesToday } = useBotStats();
  const { data: bot } = useQuery({
    queryKey: ["bot-activity", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bot_activity").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const toggleBot = async () => {
    if (!user || !bot) return;

    // If turning ON, validate everything
    if (!bot.bot_enabled) {
      // Check balance
      const { data: txns } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id);
      const balance = txns?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

      if (balance < 1) {
        toast.error("Insufficient balance to activate auto bot.");
        return;
      }
      if (plan && !canTrade) {
        toast.error("Auto bot paused: daily trade limit reached.");
        return;
      }
      if (plan && !canAutoTrade) {
        toast.error("Auto bot paused: auto trade slot limit reached.");
        return;
      }
    }

    const { error } = await supabase.from("bot_activity").update({ bot_enabled: !bot.bot_enabled }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
      toast.success(bot.bot_enabled ? "Bot deactivated" : "Bot activated");
    }
  };

  const updateRisk = async (risk: string) => {
    if (!user) return;
    const { error } = await supabase.from("bot_activity").update({ risk_profile: risk }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
      toast.success(`Risk profile set to ${risk}`);
    }
  };

  const updateLimit = async (limit: number) => {
    if (!user) return;
    const { error } = await supabase.from("bot_activity").update({ daily_trade_limit: limit }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
    }
  };

  const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl">Auto Bot</h1>

      {/* Status Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-display font-semibold">Trading Bot</span>
          </div>
          <button
            onClick={toggleBot}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${bot?.bot_enabled ? "bg-success" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-foreground transition-transform duration-300 ${bot?.bot_enabled ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Today's Profit" value={`+${fmt(bot?.profit_today ?? 0)}`} className="text-success" />
          <StatCard icon={TrendingDown} label="Today's Loss" value={`-${fmt(bot?.loss_today ?? 0)}`} className="text-destructive" />
          <StatCard icon={BarChart3} label="Trades Today" value={String(bot?.trades_today ?? 0)} />
          <StatCard icon={Timer} label="Daily Limit" value={String(bot?.daily_trade_limit ?? 15)} />
        </div>
      </div>

      {/* Plan Limits Warning */}
      {plan && (!canTrade || !canAutoTrade) && (
        <div className="glass-card p-4 flex items-center gap-3" style={{ background: "hsl(var(--warning) / 0.08)", border: "1px solid hsl(var(--warning) / 0.2)" }}>
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">Plan Limits Reached</p>
            <p className="text-xs text-muted-foreground">
              {!canTrade ? `Daily trade limit reached (${tradesToday}/${plan.max_trades_per_day}). ` : ""}
              {!canAutoTrade ? `Auto bot slot limit reached (${activeAutoTrades}/${plan.max_auto_trade_slots}). ` : ""}
              Upgrade your plan for higher limits.
            </p>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Bot Settings
        </h3>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Risk Profile</label>
          <div className="flex gap-2">
            {["conservative", "moderate", "aggressive"].map((r) => (
              <button
                key={r}
                onClick={() => updateRisk(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  bot?.risk_profile === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Daily Trade Limit</label>
          <input
            type="number"
            value={bot?.daily_trade_limit ?? 15}
            onChange={(e) => updateLimit(Number(e.target.value))}
            className="w-32 bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Compound Profits</p>
            <p className="text-xs text-muted-foreground">Reinvest profits automatically</p>
          </div>
          <button
            onClick={async () => {
              if (!user) return;
              await supabase.from("bot_activity").update({ compound_profits: !bot?.compound_profits }).eq("user_id", user.id);
              queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
            }}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${bot?.compound_profits ? "bg-success" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform duration-300 ${bot?.compound_profits ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className={`text-lg font-display font-bold ${className || "text-foreground"}`}>{value}</span>
    </div>
  );
}
