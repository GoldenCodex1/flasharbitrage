import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle, XCircle, Clock, Layers, AlertTriangle, Server } from "lucide-react";

export default function BotEngineMonitor() {
  const { data: stats } = useQuery({
    queryKey: ["bot-engine-stats"],
    refetchInterval: 15000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [queueRes, openRes, completedRes, failedRes, globalRes] = await Promise.all([
        supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("trade_entries").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("trade_entries").select("*", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", today.toISOString()),
        supabase.from("trade_entries").select("*", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("bot_global_settings").select("enabled, updated_at").limit(1).maybeSingle(),
      ]);

      return {
        queue: queueRes.count ?? 0,
        open: openRes.count ?? 0,
        completed: completedRes.count ?? 0,
        failed: failedRes.count ?? 0,
        engineEnabled: globalRes.data?.enabled ?? false,
        lastSync: globalRes.data?.updated_at ?? null,
      };
    },
  });

  const { data: serviceHealth } = useQuery({
    queryKey: ["engine-service-health"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_runtime_metrics")
        .select("metric_name, metric_value, updated_at")
        .like("metric_name", "engine_%_status");

      const services: Record<string, { status: string; updatedAt: string }> = {};
      for (const row of data ?? []) {
        const name = row.metric_name.replace("engine_", "").replace("_status", "");
        services[name] = { status: row.metric_value, updatedAt: row.updated_at };
      }
      return services;
    },
  });

  const items = [
    { label: "Trades in Queue", value: stats?.queue ?? 0, icon: Layers, color: "text-primary" },
    { label: "Open Trades", value: stats?.open ?? 0, icon: Activity, color: "text-warning" },
    { label: "Completed Today", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-success" },
    { label: "Failed Trades", value: stats?.failed ?? 0, icon: XCircle, color: "text-destructive" },
  ];

  const serviceLabels: Record<string, string> = {
    trade_engine: "Trade Engine",
    auto_bot_engine: "Auto Bot Engine",
    settlement_engine: "Settlement Engine",
    trade_generator: "Trade Generator",
  };

  const statusColor = (s: string) =>
    s === "active" ? "text-success" : s === "warning" ? "text-warning" : "text-destructive";
  const statusBg = (s: string) =>
    s === "active" ? "bg-success" : s === "warning" ? "bg-warning" : "bg-destructive";

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-base">Trade Engine Monitor</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${stats?.engineEnabled ? "text-success" : "text-destructive"}`}>
            <span className={`w-2 h-2 rounded-full ${stats?.engineEnabled ? "bg-success animate-pulse" : "bg-destructive"}`} />
            {stats?.engineEnabled ? "Engine Active" : "Engine Offline"}
          </div>
          {stats?.lastSync && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Last sync: {new Date(stats.lastSync).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {!stats?.engineEnabled && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Trading engine is currently offline. Enable via Global Master Controls.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
            <p className="text-lg font-display font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Service Health Status */}
      {serviceHealth && Object.keys(serviceHealth).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service Health</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(serviceLabels).map(([key, label]) => {
              const health = serviceHealth[key];
              const status = health?.status ?? "offline";
              return (
                <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/20 border border-border/10">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusBg(status)} ${status === "active" ? "animate-pulse" : ""}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{label}</p>
                    <p className={`text-[10px] font-semibold uppercase ${statusColor(status)}`}>{status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
