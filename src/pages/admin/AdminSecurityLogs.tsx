import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function AdminSecurityLogs() {
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs } = useQuery({
    queryKey: ["admin-security-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const filtered = actionFilter
    ? logs?.filter((l) => l.action.toLowerCase().includes(actionFilter.toLowerCase()))
    : logs;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Security Logs</h1>

      <input
        placeholder="Filter by action..."
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="bg-secondary border border-border/30 rounded-lg px-4 py-2 text-sm text-foreground w-full max-w-sm"
      />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Target</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">IP</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Details</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered && filtered.length > 0 ? filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{log.admin_id?.slice(0, 8) ?? "—"}...</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {log.target_type && <span className="mr-1 px-1.5 py-0.5 rounded bg-secondary text-xs">{log.target_type}</span>}
                    {log.target_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip_address ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
