import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  Users,
  Shield,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import BotControlStrip from "@/components/dashboard/BotControlStrip";
import SuggestedTrades from "@/components/dashboard/SuggestedTrades";
import ActiveTrades from "@/components/dashboard/ActiveTrades";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Link } from "react-router-dom";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const {
    totalBalance,
    activeTradeCount,
    totalProfit,
    pendingWithdrawalTotal,
    suggestedTradeCount,
    referralEarnings,
    referralCount,
    botActivity,
    suggestedTrades,
    activeTradeEntries,
    recentTransactions,
  } = useDashboardData();
  const { plan, tradesToday, activeAutoTrades, planExpiresAt, daysRemaining } = useUserPlan();
  const fmtLimit = (n: number) => n >= 999999 ? "∞" : String(n);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Total Balance" value={fmt(totalBalance)} icon={Wallet} />
          <MetricCard label="Active Trades" value={String(activeTradeCount)} icon={TrendingUp} />
          <MetricCard label="Total Profit" value={fmt(totalProfit)} icon={DollarSign} trend={totalProfit > 0 ? `+${((totalProfit / Math.max(totalBalance, 1)) * 100).toFixed(1)}%` : undefined} positive={totalProfit > 0} />
          <MetricCard label="Pending Withdrawal" value={fmt(pendingWithdrawalTotal)} icon={Clock} />
          <MetricCard label="Suggested Trades" value={String(suggestedTradeCount)} icon={Zap} />
          <MetricCard label="Referral Earnings" value={fmt(referralEarnings)} icon={Users} trend={referralCount > 0 ? `+${referralCount} refs` : undefined} positive={referralCount > 0} />
        </div>
      </motion.div>

      {/* Plan Card */}
      {plan && (
        <motion.div variants={item}>
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="font-display font-bold text-sm">{plan.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center"><p className="text-muted-foreground">Trades</p><p className="font-semibold">{tradesToday}/{fmtLimit(plan.max_trades_per_day)}</p></div>
              <div className="text-center"><p className="text-muted-foreground">Bot Slots</p><p className="font-semibold">{activeAutoTrades}/{fmtLimit(plan.max_auto_trade_slots)}</p></div>
              <div className="text-center"><p className="text-muted-foreground">Max Trade</p><p className="font-semibold">${Number(plan.max_trade_amount).toLocaleString()}</p></div>
              {planExpiresAt && (
                <div className="text-center"><p className="text-muted-foreground">Expires</p><p className="font-semibold">{daysRemaining !== null ? `${daysRemaining}d` : "—"}</p></div>
              )}
              <Link to="/plans" className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors hidden sm:block">Upgrade</Link>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={item}>
        <BotControlStrip botActivity={botActivity ?? null} />
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-lg mb-3">Suggested Trades</h2>
        <SuggestedTrades trades={suggestedTrades} />
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-lg mb-3">Active Trades</h2>
        <ActiveTrades entries={activeTradeEntries} />
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-lg mb-3">Recent Transactions</h2>
        <RecentTransactions transactions={recentTransactions} />
      </motion.div>
    </motion.div>
  );
}
