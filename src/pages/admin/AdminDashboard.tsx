import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import {
  Users,
  TrendingUp,
  DollarSign,
  Landmark,
  Bot,
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import SettlementEngineStatus from "@/components/admin/SettlementEngineStatus";
import AdminActivityFeed from "@/components/admin/AdminActivityFeed";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── KPI Card ─────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, trend, positive, badge }: {
  label: string; value: string; icon: any; trend?: string; positive?: boolean;
  badge?: { text: string; color: "success" | "destructive" | "warning" };
}) {
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-2 relative overflow-hidden">
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
        boxShadow: "inset 0 0 40px hsl(var(--primary) / 0.04)",
      }} />
      <div className="flex items-center justify-between relative">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <span className="text-xl sm:text-2xl font-display font-bold text-foreground relative">{value}</span>
      <div className="flex items-center gap-2 relative">
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
        {badge && (
          <span className={`status-badge-${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Alert Row ────────────────────────────────────────
function AlertRow({ severity, message, link }: { severity: "low" | "medium" | "high"; message: string; link: string }) {
  const colors = {
    low: { bg: "hsl(var(--primary) / 0.08)", border: "hsl(var(--primary) / 0.2)", text: "text-primary", icon: Info },
    medium: { bg: "hsl(var(--warning) / 0.08)", border: "hsl(var(--warning) / 0.2)", text: "text-warning", icon: AlertTriangle },
    high: { bg: "hsl(var(--destructive) / 0.08)", border: "hsl(var(--destructive) / 0.2)", text: "text-destructive", icon: ShieldAlert },
  };
  const c = colors[severity];
  return (
    <Link to={link} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:brightness-110" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <c.icon className={`w-4 h-4 shrink-0 ${c.text}`} />
      <span className="text-sm flex-1">{message}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{severity}</span>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
    </Link>
  );
}

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((k) => k + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const qOpts = { refetchInterval: 30_000 };

  // ── Section 1: System Health KPIs ──
  const { data: totalUsers } = useQuery({ queryKey: ["ecc-users", refreshKey], queryFn: async () => {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    return count ?? 0;
  }, ...qOpts });

  const { data: activeTrades } = useQuery({ queryKey: ["ecc-active-trades", refreshKey], queryFn: async () => {
    const { count } = await supabase.from("trade_entries").select("*", { count: "exact", head: true }).eq("status", "active");
    return count ?? 0;
  }, ...qOpts });

  const { data: aum } = useQuery({ queryKey: ["ecc-aum", refreshKey], queryFn: async () => {
    const { data } = await supabase.from("transactions").select("amount");
    return data?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  }, ...qOpts });

  const { data: platformProfit } = useQuery({ queryKey: ["ecc-profit", refreshKey], queryFn: async () => {
    const { data } = await supabase.from("transactions").select("amount").in("type", ["profit", "trade_profit"]);
    return data?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  }, ...qOpts });

  const { data: botStatus } = useQuery({ queryKey: ["ecc-bot", refreshKey], queryFn: async () => {
    const { data } = await supabase.from("bot_global_settings").select("enabled").limit(1).maybeSingle();
    return data?.enabled ?? false;
  }, ...qOpts });

  // ── Section 2: Financial Flow ──
  const { data: pendingDepositCount } = useQuery({ queryKey: ["ecc-pend-dep", refreshKey], queryFn: async () => {
    const { count } = await supabase.from("deposits").select("*", { count: "exact", head: true }).eq("status", "pending");
    return count ?? 0;
  }, ...qOpts });

  const { data: pendingWithdrawalAmt } = useQuery({ queryKey: ["ecc-pend-wd", refreshKey], queryFn: async () => {
    const { data } = await supabase.from("withdrawals").select("amount").eq("status", "pending");
    return data?.reduce((s, w) => s + Number(w.amount), 0) ?? 0;
  }, ...qOpts });

  const { data: todayDeposits } = useQuery({ queryKey: ["ecc-today-dep", refreshKey], queryFn: async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data } = await supabase.from("deposits").select("amount").eq("status", "approved").gte("created_at", today.toISOString());
    return data?.reduce((s, d) => s + Number(d.amount), 0) ?? 0;
  }, ...qOpts });

  const { data: todayWithdrawals } = useQuery({ queryKey: ["ecc-today-wd", refreshKey], queryFn: async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data } = await supabase.from("withdrawals").select("amount").eq("status", "approved").gte("created_at", today.toISOString());
    return data?.reduce((s, w) => s + Number(w.amount), 0) ?? 0;
  }, ...qOpts });

  const netFlow = (todayDeposits ?? 0) - (todayWithdrawals ?? 0);

  // ── Section 3: Alerts ──
  const { data: kycPending } = useQuery({ queryKey: ["ecc-kyc", refreshKey], queryFn: async () => {
    const { count } = await supabase.from("kyc").select("*", { count: "exact", head: true }).eq("status", "pending");
    return count ?? 0;
  }, ...qOpts });

  const alerts: { severity: "low" | "medium" | "high"; message: string; link: string }[] = [];
  if ((pendingWithdrawalAmt ?? 0) > 10000) alerts.push({ severity: "high", message: `${fmt(pendingWithdrawalAmt ?? 0)} in pending withdrawals`, link: "/admin/withdrawals" });
  if ((pendingDepositCount ?? 0) > 10) alerts.push({ severity: "medium", message: `${pendingDepositCount} deposits awaiting approval`, link: "/admin/deposits" });
  if (!botStatus) alerts.push({ severity: "medium", message: "Trading bot is currently paused", link: "/admin/bot" });
  if ((kycPending ?? 0) > 5) alerts.push({ severity: "low", message: `${kycPending} KYC submissions pending review`, link: "/admin/kyc" });
  if (netFlow < -5000) alerts.push({ severity: "high", message: `Negative net flow today: ${fmt(netFlow)}`, link: "/admin/withdrawals" });

  // ── Section 4: Recent Activity ──
  const { data: recentActivity } = useQuery({ queryKey: ["ecc-activity", refreshKey], queryFn: async () => {
    const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(5);
    return data ?? [];
  }, ...qOpts });

  // ── Section 5: Plan Distribution ──
  const { data: planDistribution } = useQuery({ queryKey: ["ecc-plan-dist", refreshKey], queryFn: async () => {
    const { data: plans } = await supabase.from("plans").select("id, name");
    if (!plans) return [];
    const { data: profiles } = await supabase.from("profiles").select("plan_id");
    return plans.map((p: any) => ({
      name: p.name,
      count: profiles?.filter((pr: any) => pr.plan_id === p.id).length ?? 0,
    }));
  }, ...qOpts });

  // Withdrawal risk
  const wdRisk = (pendingWithdrawalAmt ?? 0) > 20000 ? "Critical" : (pendingWithdrawalAmt ?? 0) > 5000 ? "Elevated" : "Normal";
  const wdRiskColor = wdRisk === "Critical" ? "destructive" : wdRisk === "Elevated" ? "warning" : "success";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Executive Command Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time platform intelligence · Auto-refreshes every 30s</p>
        </div>
        <button onClick={() => setRefreshKey((k) => k + 1)} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors" title="Refresh now">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* ── 1. SYSTEM HEALTH KPIs ── */}
      <motion.div variants={item}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="Total Users" value={String(totalUsers ?? 0)} icon={Users} trend={totalUsers ? `+${totalUsers}` : undefined} positive />
          <KpiCard label="Active Trades" value={String(activeTrades ?? 0)} icon={TrendingUp} />
          <KpiCard label="Assets Under Management" value={fmt(aum ?? 0)} icon={Landmark} />
          <KpiCard label="Platform Profit" value={fmt(platformProfit ?? 0)} icon={DollarSign} trend={platformProfit && platformProfit > 0 ? `+${((platformProfit / Math.max(aum ?? 1, 1)) * 100).toFixed(1)}%` : undefined} positive={(platformProfit ?? 0) > 0} />
          <KpiCard label="Bot Status" value={botStatus ? "Running" : "Paused"} icon={Bot} badge={{ text: botStatus ? "Online" : "Offline", color: botStatus ? "success" : "destructive" }} />
          <KpiCard label="Withdrawal Risk" value={wdRisk} icon={ShieldAlert} badge={{ text: wdRisk, color: wdRiskColor as any }} />
        </div>
      </motion.div>

      {/* ── SETTLEMENT ENGINE ── */}
      <motion.div variants={item}>
        <SettlementEngineStatus />
      </motion.div>

      {/* ── ADMIN ACTIVITY ── */}
      <motion.div variants={item}>
        <AdminActivityFeed />
      </motion.div>

      {/* ── 2. FINANCIAL FLOW ── */}
      <motion.div variants={item}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Financial Flow Snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="glass-card p-4 text-center">
            <ArrowDownToLine className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Deposits</p>
            <p className="text-lg font-display font-bold">{pendingDepositCount ?? 0}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <ArrowUpFromLine className="w-4 h-4 mx-auto text-warning mb-1" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Withdrawals</p>
            <p className="text-lg font-display font-bold">{fmt(pendingWithdrawalAmt ?? 0)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <ArrowDownToLine className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's Deposits</p>
            <p className="text-lg font-display font-bold">{fmt(todayDeposits ?? 0)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <ArrowUpFromLine className="w-4 h-4 mx-auto text-destructive mb-1" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's Withdrawals</p>
            <p className="text-lg font-display font-bold">{fmt(todayWithdrawals ?? 0)}</p>
          </div>
          <div className={`glass-card p-4 text-center col-span-2 sm:col-span-1`}>
            <DollarSign className={`w-4 h-4 mx-auto mb-1 ${netFlow >= 0 ? "text-success" : "text-destructive"}`} />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Flow Today</p>
            <p className={`text-lg font-display font-bold ${netFlow >= 0 ? "text-success" : "text-destructive"}`}>{fmt(netFlow)}</p>
          </div>
        </div>
      </motion.div>

      {/* ── 3. ALERTS ── */}
      <motion.div variants={item}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alerts</h2>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="glass-card p-5 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">System Operating Normally</span>
            </div>
          ) : (
            alerts.map((a, i) => <AlertRow key={i} {...a} />)
          )}
        </div>
      </motion.div>

      {/* ── 4. RECENT ACTIVITY FEED ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          <Link to="/admin/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
            View Full Log <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity && recentActivity.length > 0 ? recentActivity.map((t) => (
                  <tr key={t.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 capitalize">{t.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.user_id.slice(0, 8)}…</td>
                    <td className={`px-4 py-3 font-medium ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>{fmt(Number(t.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ── 5. PLAN DISTRIBUTION ── */}
      <motion.div variants={item}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">User Plan Distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {planDistribution?.map((p) => (
            <div key={p.name} className="glass-card p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</p>
              <p className="text-2xl font-display font-bold">{p.count}</p>
              <p className="text-xs text-muted-foreground">users</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
