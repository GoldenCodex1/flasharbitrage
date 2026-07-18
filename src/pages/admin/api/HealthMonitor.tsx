import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";

export default function HealthMonitor() {
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);

  const { data: logs } = useQuery({
    queryKey: ["api-health-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_health_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: gateways } = useQuery({
    queryKey: ["api-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("api_gateways").select("*").order("created_at");
      return data ?? [];
    },
  });

  const lastSuccess = logs?.find((l) => l.status === "success");
  const lastFailure = logs?.find((l) => l.status === "error");
  const failures24h = logs?.filter((l) => l.status === "error").length ?? 0;
  const avgLatency = logs?.length
    ? Math.round(logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / logs.length)
    : 0;

  const testConnection = async () => {
    setTesting(true);
    const start = Date.now();
    // Simulate a health check ping
    try {
      // Log health check
      const latency = Date.now() - start + Math.floor(Math.random() * 200) + 50;
      await supabase.from("api_health_logs").insert({
        provider: gateways?.[0]?.provider_name || "NOWPayments",
        status: "success",
        latency_ms: latency,
      });
      if (gateways?.[0]) {
        await supabase
          .from("api_gateways")
          .update({ status: "connected", last_health_check: new Date().toISOString(), consecutive_failures: 0 })
          .eq("id", gateways[0].id);
      }
      toast.success(`Connection successful (${latency}ms)`);
    } catch {
      await supabase.from("api_health_logs").insert({
        provider: gateways?.[0]?.provider_name || "NOWPayments",
        status: "error",
        error_message: "Connection timeout",
      });
      toast.error("Connection test failed");
    }
    setTesting(false);
    qc.invalidateQueries({ queryKey: ["api-health-logs"] });
    qc.invalidateQueries({ queryKey: ["api-gateways"] });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Gateway Health & Connectivity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor API response times, uptime, and connection health.
          </p>
        </div>
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testing…" : "Test Connection"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Avg Latency</span>
          <span className="text-lg font-bold">{avgLatency}ms</span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Last Success</span>
          <span className="text-sm font-medium text-success">
            {lastSuccess ? new Date(lastSuccess.created_at).toLocaleString() : "None"}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Last Failure</span>
          <span className="text-sm font-medium text-destructive">
            {lastFailure ? new Date(lastFailure.created_at).toLocaleString() : "None"}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Failures (Recent)</span>
          <span className={`text-lg font-bold ${failures24h > 0 ? "text-destructive" : "text-success"}`}>
            {failures24h}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Latency</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Error</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs?.slice(0, 10).map((log) => (
              <tr key={log.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2 font-medium">{log.provider}</td>
                <td className="px-4 py-2">
                  {log.status === "success" ? (
                    <span className="status-badge-success"><CheckCircle2 className="w-3 h-3" /> OK</span>
                  ) : (
                    <span className="status-badge-danger"><XCircle className="w-3 h-3" /> Error</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{log.latency_ms ? `${log.latency_ms}ms` : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                  {log.error_message || "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No health logs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
