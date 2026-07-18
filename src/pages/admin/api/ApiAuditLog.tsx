import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

export default function ApiAuditLog() {
  const { data: logs } = useQuery({
    queryKey: ["api-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_action_logs")
        .select("*")
        .in("section", ["api_settings", "api_gateways", "api_credentials", "api_update"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> API Change Log
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          All API configuration changes are recorded for audit.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Admin</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Section</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Field</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Old</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">New</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">IP</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2 font-mono text-xs">{log.admin_id?.slice(0, 8) || "System"}</td>
                <td className="px-4 py-2 text-xs">{log.section}</td>
                <td className="px-4 py-2 text-xs font-medium">{log.field_name}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                  {log.old_value ? "••••" : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                  {log.new_value ? "••••" : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{log.ip_address || "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No API change logs.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
