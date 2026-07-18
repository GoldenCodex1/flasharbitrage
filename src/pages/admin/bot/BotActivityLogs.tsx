import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function BotActivityLogs() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const perPage = 15;

  const { data: logs } = useQuery({
    queryKey: ["bot-logs", filter],
    queryFn: async () => {
      let q = supabase.from("bot_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter) q = q.ilike("action_type", `%${filter}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const paged = logs?.slice(page * perPage, (page + 1) * perPage) ?? [];
  const totalPages = Math.ceil((logs?.length ?? 0) / perPage);

  const exportCSV = () => {
    if (!logs?.length) return;
    const headers = ["Timestamp", "Admin ID", "User ID", "Action", "Category", "Previous Value", "New Value"];
    const rows = logs.map(l => [l.created_at, l.admin_id ?? "", l.user_id ?? "", l.action_type, l.category, l.previous_value ?? "", l.new_value ?? ""]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bot-logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-base">Bot Activity Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter action..." value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="w-44 h-8 text-xs" />
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {["Time", "Admin", "User", "Action", "Category", "Prev", "New"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(l => (
              <tr key={l.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{l.admin_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{l.user_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs">{l.action_type.replace(/_/g, " ")}</td>
                <td className="px-3 py-2.5"><span className="status-badge-info">{l.category}</span></td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{l.previous_value ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{l.new_value ?? "—"}</td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-secondary/50 disabled:opacity-30">Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-secondary/50 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
