import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function AdminActivityFeed() {
  const { data: logs } = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Admin Activity
        </h2>
        <Link to="/admin/audit-logs" className="text-xs text-primary hover:underline flex items-center gap-1">
          View All <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {logs && logs.length > 0 ? (
          logs.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 text-xs">
              <span className="font-mono text-[10px] text-muted-foreground w-16 truncate">
                {l.admin_id ? l.admin_id.slice(0, 6) + "…" : "system"}
              </span>
              <span className="status-badge-info text-[10px] shrink-0">{l.section}</span>
              <span className="font-medium truncate flex-1">{l.field_name}</span>
              <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-3 text-center">No admin actions yet.</p>
        )}
      </div>
    </div>
  );
}
