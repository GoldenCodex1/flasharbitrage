import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function WebhookPanel() {
  const { data: logs } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const total = logs?.length ?? 0;
  const failures24h = logs?.filter((l) => l.status === "failed").length ?? 0;
  const lastWebhook = logs?.[0];

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg">Webhook Monitoring & Security</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Track webhook delivery, failures, and verify signature integrity.
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Last Received</span>
          <span className="text-sm font-medium">
            {lastWebhook ? new Date(lastWebhook.received_at).toLocaleString() : "None"}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Last Status</span>
          <span className={`text-sm font-medium ${lastWebhook?.status === "success" ? "text-success" : "text-destructive"}`}>
            {lastWebhook?.status || "N/A"}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Failures (Recent)</span>
          <span className={`text-sm font-bold ${failures24h > 0 ? "text-destructive" : "text-success"}`}>
            {failures24h}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Total Logged</span>
          <span className="text-sm font-medium">{total}</span>
        </div>
      </div>

      {failures24h >= 5 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>High webhook failure rate detected. Gateway may need attention.</span>
        </div>
      )}

      {/* Recent logs */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Response</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Error</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Received</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2 font-medium">{log.provider}</td>
                <td className="px-4 py-2">
                  {log.status === "success" ? (
                    <span className="status-badge-success"><CheckCircle2 className="w-3 h-3" /> Success</span>
                  ) : (
                    <span className="status-badge-danger"><XCircle className="w-3 h-3" /> Failed</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{log.response_code || "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                  {log.error_message || "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {new Date(log.received_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No webhook logs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
