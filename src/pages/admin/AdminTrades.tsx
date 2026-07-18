import { motion } from "framer-motion";
import { Plus, TrendingUp, DollarSign, Lock, Clock, Activity, RefreshCw, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const STATUSES = ["all", "draft", "active", "running", "closed", "settled", "cancelled", "archived"] as const;

const riskColor = (r: string) =>
  r === "Low" ? "text-success bg-success/10" : r === "Medium" ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    running: "bg-primary/10 text-primary",
    closed: "bg-warning/10 text-warning",
    settled: "bg-success/20 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

export default function AdminTrades() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: trades, isLoading } = useQuery({
    queryKey: ["admin-trades-full"],
    queryFn: async () => {
      const { data } = await supabase.from("trades").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: entries } = useQuery({
    queryKey: ["admin-trade-entries-all"],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("*");
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  // Aggregate capital per trade
  const capitalByTrade = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    entries?.forEach((e) => {
      if (!map[e.trade_id]) map[e.trade_id] = { total: 0, count: 0 };
      map[e.trade_id].total += Number(e.amount);
      map[e.trade_id].count += 1;
    });
    return map;
  }, [entries]);

  // KPIs
  const kpis = useMemo(() => {
    if (!trades) return { active: 0, totalCapital: 0, lockedFunds: 0, avgRoi: 0, upcomingSettlements: 0 };
    const active = trades.filter((t) => t.status === "active" || t.status === "running");
    const totalCapital = Object.values(capitalByTrade).reduce((s, c) => s + c.total, 0);
    const lockedFunds = trades.filter((t) => ["active", "running"].includes(t.status))
      .reduce((s, t) => s + (capitalByTrade[t.id]?.total ?? 0), 0);
    const avgRoi = active.length > 0 ? active.reduce((s, t) => s + Number(t.roi_percent), 0) / active.length : 0;
    const in24h = trades.filter((t) => {
      if (!t.expires_at) return false;
      const diff = new Date(t.expires_at).getTime() - Date.now();
      return diff > 0 && diff < 86400000 && ["active", "running"].includes(t.status);
    }).length;
    return { active: active.length, totalCapital, lockedFunds, avgRoi, upcomingSettlements: in24h };
  }, [trades, capitalByTrade]);

  // Filtered trades
  const filtered = useMemo(() => {
    let list = trades ?? [];
    if (tab !== "all") list = list.filter((t) => t.status === tab);
    if (riskFilter !== "all") list = list.filter((t) => t.risk_level === riskFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    return list;
  }, [trades, tab, riskFilter, search]);

  const kpiCards = [
    { label: "Active Trades", value: kpis.active, icon: Activity, accent: "text-primary" },
    { label: "Total Capital Allocated", value: `$${kpis.totalCapital.toLocaleString()}`, icon: DollarSign, accent: "text-success" },
    { label: "Locked User Funds", value: `$${kpis.lockedFunds.toLocaleString()}`, icon: Lock, accent: "text-warning" },
    { label: "Avg ROI (Active)", value: `${kpis.avgRoi.toFixed(1)}%`, icon: TrendingUp, accent: "text-primary" },
    { label: "Settlements (24h)", value: kpis.upcomingSettlements, icon: Clock, accent: "text-accent-foreground" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Trade Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lifecycle management & capital oversight</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="w-3 h-3 animate-spin" /> Auto-refresh</span>
          <button onClick={() => navigate("/admin/trades/create")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Create Trade
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <k.icon className={`w-3.5 h-3.5 ${k.accent}`} />
              {k.label}
            </div>
            <p className={`font-display font-bold text-lg ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-0.5">
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs capitalize">{s === "all" ? "All" : s}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or ID..." className="pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border/30 rounded-lg text-foreground w-48" />
            </div>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="text-xs bg-secondary border border-border/30 rounded-lg px-2 py-1.5 text-foreground">
              <option value="all">All Risk</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <TabsContent value={tab} className="mt-4">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["Title", "Strategy", "ROI", "Duration", "Investment Range", "Capital Allocated", "Slots", "Risk", "Status", "Created"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  )}
                  {filtered.map((t) => {
                    const cap = capitalByTrade[t.id] ?? { total: 0, count: 0 };
                    const maxCap = (t as any).capital_cap ? Number((t as any).capital_cap) : Number(t.max_investment) * t.slot_limit;
                    const capPercent = maxCap > 0 ? Math.min((cap.total / maxCap) * 100, 100) : 0;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/admin/trades/${t.id}`)}
                        className="border-b border-border/10 hover:bg-secondary/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="font-display font-medium">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{t.id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3 text-xs capitalize">{(t as any).strategy_type ?? "arbitrage"}</td>
                        <td className="px-4 py-3 text-success font-semibold">{Number(t.roi_percent)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap">{Number(t.duration_hours)}h</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">${Number(t.min_investment)} – ${Number(t.max_investment).toLocaleString()}</td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="text-xs mb-1">${cap.total.toLocaleString()} / ${maxCap.toLocaleString()} ({capPercent.toFixed(0)}%)</div>
                          <Progress value={capPercent} className="h-1.5" />
                        </td>
                        <td className="px-4 py-3">{t.slots_filled}/{t.slot_limit}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskColor(t.risk_level)}`}>{t.risk_level}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusColor(t.status)}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {!isLoading && filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No trades found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
