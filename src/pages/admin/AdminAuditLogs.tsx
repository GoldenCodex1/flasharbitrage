import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Search, RefreshCw, Download, Filter, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PAGE_SIZE = 25;

type Log = {
  id: string;
  admin_id: string | null;
  section: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data ?? []) as Log[];
    },
  });

  const sections = useMemo(() => {
    const set = new Set<string>();
    data?.forEach((l) => set.add(l.section));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((l) => {
      if (section !== "all" && l.section !== section) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.section.toLowerCase().includes(q) ||
          l.field_name.toLowerCase().includes(q) ||
          (l.old_value ?? "").toLowerCase().includes(q) ||
          (l.new_value ?? "").toLowerCase().includes(q) ||
          (l.admin_id ?? "").toLowerCase().includes(q) ||
          (l.ip_address ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, section, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["created_at", "admin_id", "section", "field_name", "old_value", "new_value", "ip_address"];
    const rows = filtered.map((l) =>
      headers.map((h) => {
        const v = (l as any)[h] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Audit Log Viewer
          </h1>
          <p className="text-sm text-muted-foreground">All administrative actions across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-xl font-bold font-display">{data?.length ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Sections</p>
          <p className="text-xl font-bold font-display">{sections.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Filtered</p>
          <p className="text-xl font-bold font-display">{filtered.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Latest</p>
          <p className="text-xs font-medium">
            {data?.[0] ? formatDistanceToNow(new Date(data[0].created_at), { addSuffix: true }) : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search section, field, value, admin, IP…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="w-full sm:w-56">
          <Select value={section} onValueChange={(v) => { setSection(v); setPage(0); }}>
            <SelectTrigger className="h-10 text-sm">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Section</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Field</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Old → New</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l) => (
                <tr key={l.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {l.admin_id ? l.admin_id.slice(0, 8) + "…" : <span className="text-muted-foreground">system</span>}
                  </td>
                  <td className="px-4 py-3"><span className="status-badge-info">{l.section}</span></td>
                  <td className="px-4 py-3 text-xs font-medium">{l.field_name}</td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell max-w-[280px]">
                    <div className="truncate">
                      <span className="text-muted-foreground">{l.old_value ?? "—"}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="font-medium">{l.new_value ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {isLoading ? "Loading audit logs…" : "No audit logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Prev</Button>
              <span className="text-xs text-muted-foreground">{currentPage + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
