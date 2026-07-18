import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 15;
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function AdminSettlementLogs() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Settlement history
  const { data: settlements, isLoading } = useQuery({
    queryKey: ["settlement-logs", page, search],
    queryFn: async () => {
      let q = supabase
        .from("trade_settlement_summary")
        .select("*, trades!inner(title, status, roi_percent)")
        .order("processed_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        q = q.eq("trade_id", search);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: totalCount } = useQuery({
    queryKey: ["settlement-logs-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("trade_settlement_summary")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // System alerts for settlement failures
  const { data: alerts } = useQuery({
    queryKey: ["settlement-alerts", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("system_alerts")
        .select("*")
        .ilike("type", "%settlement%")
        .order("created_at", { ascending: false })
        .limit(20);

      if (statusFilter === "resolved") q = q.eq("resolved", true);
      if (statusFilter === "unresolved") q = q.eq("resolved", false);

      const { data } = await q;
      return data ?? [];
    },
  });

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Settlement Logs</h1>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Trade ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Settlement History */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30">
          <h2 className="text-sm font-semibold">Settlement History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Investors</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Principal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Profit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Total Paid</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Processed At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : settlements && settlements.length > 0 ? settlements.map((s: any) => (
                <tr key={s.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{s.trades?.title || "—"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.trade_id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3">{s.total_investors}</td>
                  <td className="px-4 py-3">{fmt(Number(s.total_principal))}</td>
                  <td className="px-4 py-3 text-success font-medium">{fmt(Number(s.total_profit))}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(Number(s.total_paid))}</td>
                  <td className="px-4 py-3">
                    <span className="status-badge-success">{s.trades?.status || "settled"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(s.processed_at), "MMM dd, yyyy HH:mm")}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No settlement records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Alerts */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Settlement Alerts</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Message</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {alerts && alerts.length > 0 ? alerts.map((a) => (
                <tr key={a.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-xs">{a.type}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate">{a.message}</td>
                  <td className="px-4 py-3">
                    <span className={`status-badge-${a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "success"}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.resolved ? (
                      <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3 h-3" /> Resolved</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="w-3 h-3" /> Open</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(a.created_at), "MMM dd, yyyy HH:mm")}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No settlement alerts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
