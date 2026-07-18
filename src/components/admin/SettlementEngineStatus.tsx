import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ExternalLink,
  Clock,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function getHealthStatus(lastRun: string | null) {
  if (!lastRun) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted", icon: Clock };
  const diff = (Date.now() - new Date(lastRun).getTime()) / 1000 / 60;
  if (diff <= 2) return { label: "Engine Healthy", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 };
  if (diff <= 5) return { label: "Delayed", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle };
  return { label: "Cron Not Running", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle };
}

export default function SettlementEngineStatus() {
  const [settling, setSettling] = useState(false);

  const { data: lastCronRun } = useQuery({
    queryKey: ["settlement-last-cron"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_runtime_metrics")
        .select("metric_value")
        .eq("metric_name", "last_cron_run")
        .maybeSingle();
      return data?.metric_value ?? null;
    },
  });

  const { data: settledToday } = useQuery({
    queryKey: ["settlement-today-count"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("status", "settled")
        .gte("settled_at", today.toISOString());
      return count ?? 0;
    },
  });

  const { data: errorCount } = useQuery({
    queryKey: ["settlement-errors-today"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("system_alerts")
        .select("*", { count: "exact", head: true })
        .eq("type", "Settlement Failure")
        .eq("resolved", false)
        .gte("created_at", today.toISOString());
      return count ?? 0;
    },
  });

  const health = getHealthStatus(lastCronRun ?? null);
  const HealthIcon = health.icon;

  const handleManualSettle = async () => {
    if (!confirm("Run manual settlement now? This will process all matured trades.")) return;
    setSettling(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-trades");
      if (error) throw error;
      toast.success("Settlement triggered", { description: JSON.stringify(data).slice(0, 120) });
    } catch (err: any) {
      toast.error("Settlement failed", { description: err.message });
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-base">Settlement Engine Status</h2>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${health.bg} ${health.color}`}>
          <HealthIcon className="w-3.5 h-3.5" />
          {health.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Cron Run</p>
          <p className="text-sm font-medium">
            {lastCronRun ? formatDistanceToNow(new Date(lastCronRun), { addSuffix: true }) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Settled Today</p>
          <p className="text-lg font-display font-bold text-success">{settledToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Errors Today</p>
          <p className={`text-lg font-display font-bold ${(errorCount ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
            {errorCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Next Check</p>
          <p className="text-sm font-medium">~60s</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleManualSettle}
          disabled={settling}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {settling ? <Zap className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
          {settling ? "Running…" : "Run Manual Settlement"}
        </button>
        <Link
          to="/admin/trades"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Settlement Logs
        </Link>
      </div>
    </div>
  );
}
