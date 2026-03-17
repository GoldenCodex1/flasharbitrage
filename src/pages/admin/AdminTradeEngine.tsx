import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Zap,
  Play,
  Pause,
  Settings2,
  Activity,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface GeneratorConfig {
  id: string;
  enabled: boolean;
  generation_interval_minutes: number;
  max_active_trades: number;
  trading_pairs: string[];
  exchanges: string[];
  min_duration_hours: number;
  max_duration_hours: number;
  min_investment_default: number;
  max_investment_default: number;
  slot_limit_default: number;
}

export default function AdminTradeEngine() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState<GeneratorConfig | null>(null);
  const [pairsInput, setPairsInput] = useState("");
  const [exchangesInput, setExchangesInput] = useState("");

  const { data: activeTradeCount } = useQuery({
    queryKey: ["admin-active-trades-count"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: generatorStatus } = useQuery({
    queryKey: ["generator-status"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_runtime_metrics")
        .select("metric_value")
        .eq("metric_name", "engine_trade_generator_status")
        .maybeSingle();
      return data?.metric_value ?? "unknown";
    },
  });

  const { data: lastGeneration } = useQuery({
    queryKey: ["last-trade-generation"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_runtime_metrics")
        .select("metric_value")
        .eq("metric_name", "last_trade_generation")
        .maybeSingle();
      return data?.metric_value ?? null;
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["trade-generator-logs"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_logs")
        .select("*")
        .eq("category", "trade_generator")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("trade_generator_config")
      .select("*")
      .limit(1)
      .single();
    if (data) {
      const c = data as unknown as GeneratorConfig;
      setConfig(c);
      setPairsInput((c.trading_pairs ?? []).join(", "));
      setExchangesInput((c.exchanges ?? []).join(", "));
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("trade_generator_config")
      .update({
        enabled: config.enabled,
        generation_interval_minutes: config.generation_interval_minutes,
        max_active_trades: config.max_active_trades,
        trading_pairs: pairsInput.split(",").map((s) => s.trim()).filter(Boolean),
        exchanges: exchangesInput.split(",").map((s) => s.trim()).filter(Boolean),
        min_duration_hours: config.min_duration_hours,
        max_duration_hours: config.max_duration_hours,
        min_investment_default: config.min_investment_default,
        max_investment_default: config.max_investment_default,
        slot_limit_default: config.slot_limit_default,
      } as any)
      .eq("id", config.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Generator config saved");
  };

  const triggerGeneration = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trades");
      if (error) throw error;
      toast.success("Trades generated", { description: `${data?.generated ?? 0} new trades created` });
      queryClient.invalidateQueries({ queryKey: ["admin-active-trades-count"] });
      queryClient.invalidateQueries({ queryKey: ["trade-generator-logs"] });
      queryClient.invalidateQueries({ queryKey: ["last-trade-generation"] });
    } catch (err: any) {
      toast.error("Generation failed", { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "ACTIVE", color: "text-success", icon: CheckCircle2 },
    limit_reached: { label: "LIMIT REACHED", color: "text-warning", icon: AlertTriangle },
    offline: { label: "PAUSED", color: "text-destructive", icon: XCircle },
    unknown: { label: "UNKNOWN", color: "text-muted-foreground", icon: Clock },
  };

  const status = statusConfig[generatorStatus ?? "unknown"] ?? statusConfig.unknown;
  const StatusIcon = status.icon;

  if (!config) {
    return <div className="glass-card p-6 animate-pulse"><div className="h-6 w-48 bg-secondary rounded" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Trade Auto-Generator Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Controlled arbitrage opportunity generation with risk profiles.</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${status.color} bg-secondary`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active Trades</p>
          <p className="text-xl font-display font-bold">{activeTradeCount ?? 0} / {config.max_active_trades}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Interval</p>
          <p className="text-xl font-display font-bold">{config.generation_interval_minutes}m</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Generated</p>
          <p className="text-sm font-medium">
            {lastGeneration ? new Date(lastGeneration).toLocaleTimeString() : "—"}
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Engine</p>
          <p className={`text-sm font-semibold ${config.enabled ? "text-success" : "text-destructive"}`}>
            {config.enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={triggerGeneration} disabled={generating} size="sm">
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          {generating ? "Generating..." : "Generate Now"}
        </Button>
      </div>

      {/* Configuration */}
      <div className="glass-card p-5 sm:p-6 space-y-5">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Generator Configuration
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable Auto Generator</Label>
            <p className="text-xs text-muted-foreground">Automatically creates trades on schedule</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Generation Interval (minutes)</Label>
            <Input type="number" value={config.generation_interval_minutes} onChange={(e) => setConfig({ ...config, generation_interval_minutes: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max Active Trades</Label>
            <Input type="number" value={config.max_active_trades} onChange={(e) => setConfig({ ...config, max_active_trades: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Slot Limit per Trade</Label>
            <Input type="number" value={config.slot_limit_default} onChange={(e) => setConfig({ ...config, slot_limit_default: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min Duration (hours)</Label>
            <Input type="number" value={config.min_duration_hours} onChange={(e) => setConfig({ ...config, min_duration_hours: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max Duration (hours)</Label>
            <Input type="number" value={config.max_duration_hours} onChange={(e) => setConfig({ ...config, max_duration_hours: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min Investment ($)</Label>
            <Input type="number" value={config.min_investment_default} onChange={(e) => setConfig({ ...config, min_investment_default: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max Investment ($)</Label>
            <Input type="number" value={config.max_investment_default} onChange={(e) => setConfig({ ...config, max_investment_default: Number(e.target.value) })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Trading Pairs (comma-separated)</Label>
          <Input value={pairsInput} onChange={(e) => setPairsInput(e.target.value)} placeholder="BTC/USDT, ETH/USDT, SOL/USDT" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Exchanges (comma-separated)</Label>
          <Input value={exchangesInput} onChange={(e) => setExchangesInput(e.target.value)} placeholder="Binance, Coinbase, Kraken" />
        </div>

        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Generation Logs
        </h3>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 text-xs bg-secondary/30 rounded-lg p-2.5">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                <span className="font-mono text-primary">{log.action_type}</span>
                <span className="text-foreground">{log.new_value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No generation events logged yet.</p>
        )}
      </div>
    </motion.div>
  );
}
