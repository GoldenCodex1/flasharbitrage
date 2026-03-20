import { Bot, Power, ShieldAlert, TrendingUp, TrendingDown, BarChart3, Timer, Wallet, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useBotStats } from "@/hooks/useBotStats";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  botActivity: (Tables<"bot_activity"> & { capital_allocation?: number; max_per_trade_percent?: number }) | null;
}

export default function BotControlStrip({ botActivity }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plan, canTrade, canAutoTrade } = useUserPlan();
  const { profitToday, lossToday, tradesToday } = useBotStats();
  const botOn = botActivity?.bot_enabled ?? false;
  const [showSettings, setShowSettings] = useState(false);
  const [allocation, setAllocation] = useState(String(botActivity?.capital_allocation ?? 0));
  const [maxPercent, setMaxPercent] = useState(String(botActivity?.max_per_trade_percent ?? 25));

  useEffect(() => {
    setAllocation(String(botActivity?.capital_allocation ?? 0));
    setMaxPercent(String(botActivity?.max_per_trade_percent ?? 25));
  }, [botActivity]);

  // Realtime subscription for live bot updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('bot-activity-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_activity', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const toggleBot = async () => {
    if (!user) return;
    
    let currentBot = botActivity;
    if (!currentBot) {
      const { data: newBot } = await supabase
        .from("bot_activity")
        .upsert({ user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (!newBot) {
        toast.error("Failed to initialize bot");
        return;
      }
      currentBot = newBot;
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
    }

    if (!currentBot.bot_enabled) {
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

    const { error } = await supabase
      .from("bot_activity")
      .update({ bot_enabled: !currentBot.bot_enabled })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to toggle bot");
    } else {
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
      toast.success(currentBot.bot_enabled ? "Bot deactivated" : "Bot activated");
    }
  };

  const saveAllocation = async () => {
    if (!user) return;
    const alloc = Math.max(0, Number(allocation) || 0);
    const pct = Math.min(100, Math.max(1, Number(maxPercent) || 25));
    const { error } = await supabase
      .from("bot_activity")
      .update({ capital_allocation: alloc, max_per_trade_percent: pct } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Bot capital settings saved");
      queryClient.invalidateQueries({ queryKey: ["bot-activity"] });
      setShowSettings(false);
    }
  };

  const fmt = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-sm">Auto Bot</span>
          </div>

          <button
            onClick={toggleBot}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              botOn ? "bg-success" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform duration-300 ${
                botOn ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>

          <span className={`status-badge text-xs ${botOn ? "status-badge-success" : "status-badge-pending"}`}>
            <Power className="w-3 h-3" />
            {botOn ? "Active" : "Inactive"}
          </span>

          <span className="status-badge-info text-xs">
            <ShieldAlert className="w-3 h-3" />
            {botActivity?.risk_profile ?? "Moderate"}
          </span>

          <button
            onClick={() => setShowSettings(s => !s)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {showSettings ? "Hide Settings" : "Capital Settings"}
          </button>
        </div>

        <div className="flex items-center gap-6 flex-wrap ml-auto">
          <Stat icon={TrendingUp} label="Today's Profit" value={`+${fmt(profitToday)}`} className="text-success" />
          <Stat icon={TrendingDown} label="Today's Loss" value={`-${fmt(lossToday)}`} className="text-destructive" />
          <Stat icon={BarChart3} label="Trades Today" value={String(tradesToday)} />
          <Stat icon={Timer} label="Daily Limit" value={String(botActivity?.daily_trade_limit ?? 15)} />
          {Number(botActivity?.capital_allocation ?? 0) > 0 && (
            <Stat icon={Wallet} label="Allocated" value={fmt(Number(botActivity?.capital_allocation ?? 0))} />
          )}
        </div>
      </div>

      {showSettings && (
        <div className="border-t border-border/30 pt-3 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Bot Capital Allocation ($)</label>
            <Input
              type="number"
              className="w-32 h-8 text-xs"
              value={allocation}
              onChange={e => setAllocation(e.target.value)}
              placeholder="0 = full balance"
              min={0}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Max Per Trade (%)</label>
            <Input
              type="number"
              className="w-24 h-8 text-xs"
              value={maxPercent}
              onChange={e => setMaxPercent(e.target.value)}
              min={1}
              max={100}
            />
          </div>
          <button
            onClick={saveAllocation}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
          <p className="text-[10px] text-muted-foreground max-w-xs">
            Set to 0 to use full balance. Max per trade caps each trade at a % of your allocation.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
        <span className={`text-sm font-semibold font-display ${className || "text-foreground"}`}>{value}</span>
      </div>
    </div>
  );
}
