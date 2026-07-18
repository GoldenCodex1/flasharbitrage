import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, startOfDay, format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Clock,
  Shield,
  Activity,
  Banknote,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
const fmtSigned = (n: number) => (n >= 0 ? "+" : "−") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ── Data Hook ──
function useFinanceData() {
  const queryClient = useQueryClient();
  const todayStart = startOfDay(new Date()).toISOString();

  const { data: deposits } = useQuery({
    queryKey: ["finance-deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["finance-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: tradeEntries } = useQuery({
    queryKey: ["finance-trade-entries"],
    queryFn: async () => {
      const { data } = await supabase.from("trade_entries").select("*").eq("status", "active");
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const kpis = useMemo(() => {
    if (!deposits || !withdrawals || !transactions || !tradeEntries) return null;

    const totalDeposits = deposits.filter(d => d.status === "approved").reduce((s, d) => s + Number(d.amount), 0);
    const totalWithdrawals = withdrawals.filter(w => w.status === "approved").reduce((s, w) => s + Number(w.amount), 0);
    const netFlow = totalDeposits - totalWithdrawals;

    const todayDeposits = deposits.filter(d => d.status === "approved" && d.created_at >= todayStart).reduce((s, d) => s + Number(d.amount), 0);
    const todayWithdrawals = withdrawals.filter(w => w.status === "approved" && w.created_at >= todayStart).reduce((s, w) => s + Number(w.amount), 0);

    const pendingWithdrawalsAmt = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount), 0);
    const pendingWithdrawalsCount = withdrawals.filter(w => w.status === "pending").length;
    const pendingDepositsCount = deposits.filter(d => d.status === "pending").length;

    // AUM from transactions ledger
    const userBalances: Record<string, number> = {};
    transactions.forEach(tx => {
      userBalances[tx.user_id] = (userBalances[tx.user_id] ?? 0) + Number(tx.amount);
    });
    const totalUserBalances = Object.values(userBalances).reduce((s, b) => s + Math.max(0, b), 0);
    const lockedFunds = tradeEntries.reduce((s, t) => s + Number(t.amount), 0);
    const availableLiquidity = totalUserBalances - lockedFunds;

    const coverageRatio = pendingWithdrawalsAmt > 0 ? availableLiquidity / pendingWithdrawalsAmt : 999;

    return {
      totalDeposits, totalWithdrawals, netFlow,
      todayDeposits, todayWithdrawals, todayNetFlow: todayDeposits - todayWithdrawals,
      pendingWithdrawalsAmt, pendingWithdrawalsCount, pendingDepositsCount,
      totalUserBalances, lockedFunds, availableLiquidity, coverageRatio,
    };
  }, [deposits, withdrawals, transactions, tradeEntries, todayStart]);

  // Anomalies
  const anomalies = useMemo(() => {
    if (!deposits || !withdrawals) return [];
    const alerts: { severity: "high" | "medium" | "low"; message: string; link: string }[] = [];

    const pendingWAmt = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount), 0);
    if (pendingWAmt > 10000) alerts.push({ severity: "high", message: `Pending withdrawals total ${fmt(pendingWAmt)}`, link: "/admin/withdrawals" });

    const largeWithdrawals = withdrawals.filter(w => w.status === "pending" && Number(w.amount) > 5000);
    if (largeWithdrawals.length > 0) alerts.push({ severity: "high", message: `${largeWithdrawals.length} large withdrawal(s) above $5,000`, link: "/admin/withdrawals" });

    const todayDeps = deposits.filter(d => d.created_at >= todayStart);
    if (todayDeps.length > 20) alerts.push({ severity: "medium", message: `Deposit spike: ${todayDeps.length} deposits today`, link: "/admin/deposits" });

    const pendingDeps = deposits.filter(d => d.status === "pending");
    if (pendingDeps.length > 10) alerts.push({ severity: "medium", message: `${pendingDeps.length} deposits awaiting review`, link: "/admin/deposits" });

    if (kpis && kpis.coverageRatio < 1.0) alerts.push({ severity: "high", message: "Liquidity below safe threshold – coverage ratio < 1.0", link: "/admin/finance" });
    else if (kpis && kpis.coverageRatio < 1.5) alerts.push({ severity: "medium", message: "Liquidity watch – coverage ratio between 1.0–1.5", link: "/admin/finance" });

    return alerts;
  }, [deposits, withdrawals, kpis, todayStart]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-deposits"] });
    queryClient.invalidateQueries({ queryKey: ["finance-withdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["finance-trade-entries"] });
  };

  return { kpis, deposits, withdrawals, transactions, anomalies, refresh };
}

// ── KPI Card ──
function KpiCard({ label, value, icon: Icon, color, trend }: { label: string; value: string; icon: React.ElementType; color?: string; trend?: "up" | "down" | null }) {
  return (
    <motion.div variants={fadeUp} className="glass-card p-4 sm:p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color ?? "bg-primary/15"}`}>
          <Icon className={`w-4 h-4 ${color ? "" : "text-primary"}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-lg sm:text-xl font-display font-bold">{value}</span>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${trend === "up" ? "text-success" : "text-destructive"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Coverage Badge ──
function CoverageBadge({ ratio }: { ratio: number }) {
  const label = ratio >= 1.5 ? "Safe" : ratio >= 1.0 ? "Watch" : "Critical";
  const cls = ratio >= 1.5 ? "status-badge-success" : ratio >= 1.0 ? "status-badge-warning" : "status-badge-danger";
  return <span className={cls}>{label} ({ratio >= 100 ? "∞" : ratio.toFixed(2)}x)</span>;
}

// ── Main Page ──
export default function AdminFinance() {
  const { kpis, deposits, withdrawals, transactions, anomalies, refresh } = useFinanceData();
  const [activeTab, setActiveTab] = useState("all");

  // Auto refresh countdown
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c <= 1 ? 30 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const loading = !kpis;

  // Filtered data for tabs
  const tabData = useMemo(() => {
    if (!transactions || !deposits || !withdrawals) return [];
    switch (activeTab) {
      case "deposits": return (deposits ?? []).map(d => ({ id: d.id, user_id: d.user_id, type: "deposit", amount: Number(d.amount), status: d.status, created_at: d.created_at, description: `${d.currency} via ${d.method}` }));
      case "withdrawals": return (withdrawals ?? []).map(w => ({ id: w.id, user_id: w.user_id, type: "withdrawal", amount: -Number(w.amount), status: w.status, created_at: w.created_at, description: `${w.currency} → ${w.wallet_address.slice(0, 12)}...` }));
      case "ledger": return (transactions ?? []).map(tx => ({ id: tx.id, user_id: tx.user_id, type: tx.type, amount: Number(tx.amount), status: "completed", created_at: tx.created_at, description: tx.description ?? "—" }));
      default: return (transactions ?? []).slice(0, 100).map(tx => ({ id: tx.id, user_id: tx.user_id, type: tx.type, amount: Number(tx.amount), status: "completed", created_at: tx.created_at, description: tx.description ?? "—" }));
    }
  }, [activeTab, transactions, deposits, withdrawals]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Financial Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Liquidity oversight & transaction intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Refresh in {countdown}s
          </span>
          <button onClick={() => { refresh(); setCountdown(30); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 1. Financial Health KPIs ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Deposits (All Time)" value={fmt(kpis.totalDeposits)} icon={ArrowDownToLine} color="bg-success/15" trend="up" />
            <KpiCard label="Total Withdrawals (All Time)" value={fmt(kpis.totalWithdrawals)} icon={ArrowUpFromLine} color="bg-destructive/15" trend="down" />
            <KpiCard label="Net Platform Flow" value={fmtSigned(kpis.netFlow)} icon={DollarSign} color={kpis.netFlow >= 0 ? "bg-success/15" : "bg-destructive/15"} trend={kpis.netFlow >= 0 ? "up" : "down"} />
            <KpiCard label="Pending Deposits" value={String(kpis.pendingDepositsCount)} icon={Clock} />
          </motion.div>

          {/* ── Financial Flow (Today) ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Today's Deposits" value={fmt(kpis.todayDeposits)} icon={ArrowDownToLine} color="bg-success/15" />
            <KpiCard label="Today's Withdrawals" value={fmt(kpis.todayWithdrawals)} icon={ArrowUpFromLine} color="bg-destructive/15" />
            <motion.div variants={fadeUp} className={`glass-card p-4 sm:p-5 flex flex-col gap-2 border ${kpis.todayNetFlow >= 0 ? "border-success/30" : "border-destructive/30"}`}>
              <span className="text-xs font-medium text-muted-foreground">Net Flow Today</span>
              <span className={`text-lg sm:text-xl font-display font-bold ${kpis.todayNetFlow >= 0 ? "text-success" : "text-destructive"}`}>
                {fmtSigned(kpis.todayNetFlow)}
              </span>
            </motion.div>
            <KpiCard label="Pending Withdrawals" value={`${kpis.pendingWithdrawalsCount} (${fmt(kpis.pendingWithdrawalsAmt)})`} icon={AlertTriangle} color={kpis.pendingWithdrawalsAmt > 5000 ? "bg-destructive/15" : "bg-warning/15"} />
          </motion.div>

          {/* ── 2. Liquidity & Exposure Panel ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-base">Liquidity & Exposure</h2>
              </div>
              <CoverageBadge ratio={kpis.coverageRatio} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total User Balances (Liability)</p>
                <p className="font-display font-bold text-lg">{fmt(kpis.totalUserBalances)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Locked in Active Trades</p>
                <p className="font-display font-bold text-lg">{fmt(kpis.lockedFunds)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Available Liquidity</p>
                <p className="font-display font-bold text-lg">{fmt(kpis.availableLiquidity)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Withdrawal Coverage Ratio</p>
                <p className={`font-display font-bold text-lg ${kpis.coverageRatio >= 1.5 ? "text-success" : kpis.coverageRatio >= 1.0 ? "text-warning" : "text-destructive"}`}>
                  {kpis.coverageRatio >= 100 ? "∞" : kpis.coverageRatio.toFixed(2)}x
                </p>
              </div>
            </div>
            {/* Coverage bar */}
            <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${kpis.coverageRatio >= 1.5 ? "bg-success" : kpis.coverageRatio >= 1.0 ? "bg-warning" : "bg-destructive"}`}
                style={{ width: `${Math.min(100, (kpis.coverageRatio / 3) * 100)}%` }}
              />
            </div>
          </motion.div>

          {/* ── 3. Anomaly & Risk Alerts ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-warning" />
              <h2 className="font-display font-semibold text-base">Financial Alerts</h2>
            </div>
            {anomalies.length === 0 ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" /> No financial anomalies detected.
              </div>
            ) : (
              <div className="space-y-2">
                {anomalies.map((a, i) => (
                  <Link key={i} to={a.link} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className={a.severity === "high" ? "status-badge-danger" : a.severity === "medium" ? "status-badge-warning" : "status-badge-info"}>
                        {a.severity}
                      </span>
                      <span className="text-sm">{a.message}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── 4. Transaction Overview Tabs ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass-card overflow-hidden">
            <div className="p-5 sm:p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-base">Transaction Overview</h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-5 sm:px-6">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="deposits">Deposits</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                  <TabsTrigger value="ledger">Ledger</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value={activeTab} className="mt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">User</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.length > 0 ? tabData.slice(0, 50).map((row) => (
                        <tr key={row.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs">{row.user_id.slice(0, 8)}…</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary">{row.type.replace(/_/g, " ")}</span>
                          </td>
                          <td className={`px-5 py-3 font-semibold ${row.amount >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmtSigned(row.amount)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={row.status === "approved" || row.status === "completed" ? "status-badge-success" : row.status === "rejected" ? "status-badge-danger" : "status-badge-warning"}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{row.description}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/deposits" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
              <ArrowDownToLine className="w-3.5 h-3.5" /> Manage Deposits
            </Link>
            <Link to="/admin/withdrawals" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
              <ArrowUpFromLine className="w-3.5 h-3.5" /> Manage Withdrawals
            </Link>
            <Link to="/admin/transactions" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
              <Banknote className="w-3.5 h-3.5" /> Full Transaction Log
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
