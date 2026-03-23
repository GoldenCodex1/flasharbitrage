import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, User, DollarSign, Activity, Shield, Lock, Ban,
  Pencil, RotateCcw, AlertTriangle, ChevronDown, ChevronUp,
  Mail, Calendar, CreditCard, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";

export default function AdminUserDetail() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();

  // Dialogs
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"credit" | "debit">("credit");
  const [balanceReason, setBalanceReason] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editKyc, setEditKyc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showDanger, setShowDanger] = useState(false);
  const [adminToggling, setAdminToggling] = useState(false);

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ["admin-user-detail", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  // Fetch user email via RPC
  const { data: userEmail } = useQuery({
    queryKey: ["admin-user-email", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_email", { _user_id: userId! });
      return (data as string) ?? "—";
    },
  });

  // Fetch user plan
  const { data: userPlan } = useQuery({
    queryKey: ["admin-user-plan", profile?.plan_id],
    enabled: !!profile?.plan_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("id", profile!.plan_id!)
        .maybeSingle();
      return data;
    },
  });

  // Bot activity
  const { data: botActivity } = useQuery({
    queryKey: ["admin-user-bot", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_activity")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  // Check if user is admin
  const { data: userRole } = useQuery({
    queryKey: ["admin-user-role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      return data;
    },
  });

  const isUserAdmin = !!userRole;

  // Transactions
  const { data: transactions } = useQuery({
    queryKey: ["admin-user-txns", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  // Trade entries
  const { data: tradeEntries } = useQuery({
    queryKey: ["admin-user-trades", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_entries")
        .select("*")
        .eq("user_id", userId!)
        .order("started_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Risk score
  const { data: riskScore } = useQuery({
    queryKey: ["admin-user-risk", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_scores")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  // KYC
  const { data: kycRecord } = useQuery({
    queryKey: ["admin-user-kyc", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc")
        .select("*")
        .eq("user_id", userId!)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Referrals
  const { data: referrals } = useQuery({
    queryKey: ["admin-user-referrals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", userId!);
      return data ?? [];
    },
  });

  // Financial calculations
  const financials = useMemo(() => {
    if (!transactions) return { balance: 0, deposited: 0, withdrawn: 0, profit: 0, locked: 0, referralEarnings: 0 };
    const balance = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const deposited = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
    const withdrawn = transactions.filter(t => t.type === "withdrawal").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const profit = transactions.filter(t => t.type === "profit").reduce((s, t) => s + Number(t.amount), 0);
    const referralEarnings = transactions.filter(t => t.type === "referral").reduce((s, t) => s + Number(t.amount), 0);
    const locked = tradeEntries?.filter(e => e.status === "active").reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    return { balance, deposited, withdrawn, profit, locked, referralEarnings };
  }, [transactions, tradeEntries]);

  const fmtUsd = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const logAction = async (section: string, field: string, oldVal: string | null, newVal: string | null) => {
    await supabase.from("admin_action_logs").insert({
      admin_id: adminUser?.id ?? null,
      section,
      field_name: field,
      old_value: oldVal,
      new_value: newVal,
    });
  };

  // Actions
  const toggleFreeze = async () => {
    if (!profile) return;
    const newState = !profile.is_frozen;
    const { error } = await supabase.from("profiles").update({ is_frozen: newState }).eq("user_id", userId!);
    if (error) return toast.error(error.message);
    await logAction("users", "is_frozen", String(profile.is_frozen), String(newState));
    toast.success(newState ? "Account frozen" : "Account unfrozen");
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
  };

  const saveBalance = async () => {
    const amt = parseFloat(balanceAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("Enter a valid positive amount");
    if (!balanceReason.trim()) return toast.error("Reason is required for balance adjustments");

    setBalanceSaving(true);
    const finalAmount = balanceType === "credit" ? amt : -amt;
    const prevBalance = financials.balance;

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: userId!,
        amount: finalAmount,
        type: balanceType === "credit" ? "admin_credit" : "admin_debit",
        description: `Admin: ${balanceReason}`,
      });

      if (error) {
        console.error("Balance adjustment error:", error);
        toast.error("Failed to adjust balance: " + error.message);
      } else {
        await logAction("users/balance", balanceType, fmtUsd(prevBalance), fmtUsd(prevBalance + finalAmount));
        toast.success(`Balance ${balanceType === "credit" ? "credited" : "debited"}: ${fmtUsd(amt)}`);
        setBalanceOpen(false);
        setBalanceAmount("");
        setBalanceReason("");
        queryClient.invalidateQueries({ queryKey: ["admin-user-txns", userId] });
      }
    } catch (err: any) {
      console.error("Balance adjustment exception:", err);
      toast.error("Unexpected error: " + (err?.message ?? "Unknown"));
    }
    setBalanceSaving(false);
  };

  const openEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditKyc(profile?.kyc_status ?? "pending");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName, kyc_status: editKyc })
      .eq("user_id", userId!);
    if (!error) {
      if (editName !== (profile.full_name ?? "")) {
        await logAction("users/profile", "full_name", profile.full_name, editName);
      }
      if (editKyc !== profile.kyc_status) {
        await logAction("users/kyc", "kyc_status", profile.kyc_status, editKyc);
      }
      toast.success("Profile updated");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    } else {
      toast.error(error.message);
    }
    setEditSaving(false);
  };

  const confirmDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("bot_activity").delete().eq("user_id", userId);
    await supabase.from("trade_entries").delete().eq("user_id", userId);
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("deposits").delete().eq("user_id", userId);
    await supabase.from("withdrawals").delete().eq("user_id", userId);
    await supabase.from("kyc").delete().eq("user_id", userId);
    await supabase.from("referrals").delete().eq("referrer_id", userId);
    await supabase.from("referrals").delete().eq("referred_id", userId);
    await supabase.from("totp_secrets").delete().eq("user_id", userId);
    await supabase.from("risk_scores").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    setDeleting(false);
    if (error) return toast.error(error.message);
    await logAction("users", "delete", userId, null);
    toast.success("User deleted");
    navigate("/admin/users");
  };

  const toggleAdminRole = async () => {
    if (!userId) return;
    setAdminToggling(true);
    try {
      if (isUserAdmin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
        await logAction("users/role", "admin_role", "admin", "user");
        toast.success("Admin privileges revoked");
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
        await logAction("users/role", "admin_role", "user", "admin");
        toast.success("User promoted to admin");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-user-role", userId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
    setAdminToggling(false);
  };

  const reset2FA = async () => {
    if (!userId) return;
    await supabase.from("totp_secrets").delete().eq("user_id", userId);
    await supabase.from("profiles").update({ two_factor_enabled: false }).eq("user_id", userId);
    await logAction("users/security", "two_factor", "enabled", "disabled");
    toast.success("2FA reset");
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
  };

  const resetKyc = async () => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ kyc_status: "pending" }).eq("user_id", userId);
    if (!error) {
      await logAction("users/kyc", "kyc_status", profile?.kyc_status ?? "", "pending");
      toast.success("KYC status reset to pending");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    } else toast.error(error.message);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading user…</p>
      </div>
    );
  }

  const riskScoreVal = riskScore?.score ?? 0;
  const activityTimeline = (transactions ?? []).slice(0, 20).map(tx => ({
    type: tx.type.replace(/_/g, " "),
    amount: Number(tx.amount),
    description: tx.description,
    time: tx.created_at,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-xl">{profile.full_name || "Unnamed User"}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{userId}</span>
            {userEmail && userEmail !== "—" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {userEmail}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={profile.is_frozen ? "status-badge-danger" : "status-badge-success"}>
            {profile.is_frozen ? "Frozen" : "Active"}
          </span>
          <span className={
            profile.kyc_status === "approved" ? "status-badge-success" :
            profile.kyc_status === "pending" ? "status-badge-warning" : "status-badge-danger"
          }>KYC: {profile.kyc_status}</span>
          {riskScoreVal > 70 ? (
            <span className="status-badge-danger">Risk: {riskScoreVal}</span>
          ) : riskScoreVal > 30 ? (
            <span className="status-badge-warning">Risk: {riskScoreVal}</span>
          ) : (
            <span className="status-badge-success">Risk: {riskScoreVal}</span>
          )}
        </div>
      </div>

      {/* Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A: Identity Panel */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-sm">Identity & Profile</h2>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1" onClick={openEdit}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{profile.full_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-xs break-all">{userEmail || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referral Code</p>
              <p className="font-mono text-xs">{profile.referral_code || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registered</p>
              <p>{format(new Date(profile.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referrals Made</p>
              <p>{referrals?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">2FA</p>
              <p>{profile.two_factor_enabled ? "✅ Enabled" : "❌ Disabled"}</p>
            </div>
          </div>

          {/* Plan Info */}
          <div className="border-t border-border/20 pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Plan</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="font-semibold">{userPlan?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Trade</p>
                <p>{userPlan ? fmtUsd(userPlan.max_trade_amount) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trades/Day</p>
                <p>{userPlan?.max_trades_per_day ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expires</p>
                <p>{profile.plan_expires_at ? format(new Date(profile.plan_expires_at), "MMM d, yyyy") : "Never"}</p>
              </div>
            </div>
          </div>

          {/* KYC Section */}
          {kycRecord && (
            <div className="border-t border-border/20 pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">KYC Submission</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Document Type</p>
                  <p>{kycRecord.document_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{formatDistanceToNow(new Date(kycRecord.submitted_at), { addSuffix: true })}</p>
                </div>
                {kycRecord.admin_note && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Admin Note</p>
                    <p className="text-xs">{kycRecord.admin_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* B: Financial Snapshot */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-success" />
            <h2 className="font-display font-semibold text-sm">Financial Snapshot</h2>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1" onClick={() => setBalanceOpen(true)}>
              <DollarSign className="h-3 w-3" /> Adjust
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Balance", value: financials.balance, color: financials.balance >= 0 ? "text-success" : "text-destructive" },
              { label: "Deposited", value: financials.deposited, color: "text-foreground" },
              { label: "Withdrawn", value: financials.withdrawn, color: "text-foreground" },
              { label: "Net Profit", value: financials.profit, color: financials.profit >= 0 ? "text-success" : "text-destructive" },
              { label: "Locked", value: financials.locked, color: "text-warning" },
              { label: "Referral Earned", value: financials.referralEarnings, color: "text-primary" },
            ].map(f => (
              <div key={f.label} className="rounded-lg bg-secondary/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                <p className={`text-lg font-bold font-display ${f.color}`}>{fmtUsd(f.value)}</p>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground pt-1">
            Total Trades: {tradeEntries?.length ?? 0}
          </div>

          {/* Bot Status */}
          {botActivity && (
            <div className="border-t border-border/20 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Auto Bot</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <p className={botActivity.bot_enabled ? "text-success font-semibold text-xs" : "text-muted-foreground text-xs"}>
                    {botActivity.bot_enabled ? "ON" : "OFF"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Capital</p>
                  <p className="text-xs">{fmtUsd(Number(botActivity.capital_allocation))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Risk</p>
                  <p className="text-xs capitalize">{botActivity.risk_profile}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Trades Today</p>
                  <p className="text-xs">{botActivity.trades_today}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit Today</p>
                  <p className="text-xs text-success">{fmtUsd(Number(botActivity.profit_today))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Loss Today</p>
                  <p className="text-xs text-destructive">{fmtUsd(Number(botActivity.loss_today))}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* C: Activity Timeline */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-sm">Activity Timeline</h2>
          </div>
          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
            {activityTimeline.length > 0 ? activityTimeline.map((evt, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/10 last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium capitalize">{evt.type}</span>
                  {evt.description && <span className="ml-2 text-xs text-muted-foreground truncate">{evt.description}</span>}
                </div>
                {evt.amount !== 0 && (
                  <span className={`text-xs font-semibold flex-shrink-0 ${evt.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {evt.amount >= 0 ? "+" : ""}{fmtUsd(evt.amount)}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDistanceToNow(new Date(evt.time), { addSuffix: true })}
                </span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
            )}
          </div>
        </div>

        {/* D: Admin Control Panel (Danger Zone) */}
        <div className="glass-card p-5 space-y-4">
          <button
            onClick={() => setShowDanger(!showDanger)}
            className="flex items-center gap-2 w-full"
          >
            <Shield className="h-4 w-4 text-destructive" />
            <h2 className="font-display font-semibold text-sm">Admin Controls</h2>
            {showDanger ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
          </button>

          {showDanger && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={isUserAdmin ? "destructive" : "default"}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={toggleAdminRole}
                  disabled={adminToggling || userId === adminUser?.id}
                >
                  <Shield className="h-3.5 w-3.5" />
                  {adminToggling ? "Updating…" : isUserAdmin ? "Revoke Admin" : "Make Admin"}
                </Button>
                <Button
                  variant={profile.is_frozen ? "default" : "destructive"}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={toggleFreeze}
                >
                  <Ban className="h-3.5 w-3.5" />
                  {profile.is_frozen ? "Unfreeze Account" : "Freeze Account"}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setBalanceOpen(true)}>
                  <DollarSign className="h-3.5 w-3.5" /> Adjust Balance
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={reset2FA}>
                  <Lock className="h-3.5 w-3.5" /> Reset 2FA
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={resetKyc}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset KYC
                </Button>
              </div>

              <div className="border-t border-border/20 pt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs w-full"
                  onClick={() => setDeleteOpen(true)}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Delete User Permanently
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Ledger-safe balance adjustment for {profile.full_name || "this user"} ({userEmail || userId}).
              Current balance: {fmtUsd(financials.balance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={balanceType} onValueChange={(v) => setBalanceType(v as "credit" | "debit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Add Funds)</SelectItem>
                  <SelectItem value="debit">Debit (Remove Funds)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" min="0" step="0.01" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="Mandatory reason for this adjustment…"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceOpen(false)}>Cancel</Button>
            <Button onClick={saveBalance} disabled={balanceSaving}>
              {balanceSaving ? "Processing…" : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update user profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>KYC Status</Label>
              <Select value={editKyc} onValueChange={setEditKyc}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{profile.full_name || "this user"}</strong> ({userEmail}) and all their data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
