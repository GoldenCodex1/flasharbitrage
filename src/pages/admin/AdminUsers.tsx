import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Search, X, ChevronLeft, ChevronRight, Users, ShieldCheck, Ban,
  DollarSign, AlertTriangle, Filter, RefreshCw, Mail, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 15;

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  kyc_status: string;
  is_frozen: boolean;
  avatar_url: string | null;
  referral_code: string | null;
  created_at: string;
  plan_id: string | null;
};

type UserWithFinancials = Profile & {
  email: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  lockedBalance: number;
  riskScore: number;
  planName: string;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKyc, setFilterKyc] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch profiles
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-users-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Profile[];
    },
  });

  // Fetch user emails via security definer function
  const { data: userEmails } = useQuery({
    queryKey: ["admin-users-emails"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_emails");
      return (data ?? []) as { user_id: string; email: string }[];
    },
  });

  // Fetch plans for plan names
  const { data: plans } = useQuery({
    queryKey: ["admin-users-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("id, name");
      return data ?? [];
    },
  });

  // Fetch all transactions for balance calculation
  const { data: allTransactions } = useQuery({
    queryKey: ["admin-users-all-txns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("user_id, amount, type");
      return data ?? [];
    },
  });

  // Fetch active trade entries for locked balance
  const { data: activeEntries } = useQuery({
    queryKey: ["admin-users-active-entries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trade_entries")
        .select("user_id, amount")
        .eq("status", "active");
      return data ?? [];
    },
  });

  // Fetch risk scores
  const { data: riskScores } = useQuery({
    queryKey: ["admin-users-risk-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_scores")
        .select("user_id, score");
      return data ?? [];
    },
  });

  // Compute enriched user list
  const enrichedUsers = useMemo<UserWithFinancials[]>(() => {
    if (!profiles) return [];

    const emailMap = new Map<string, string>();
    userEmails?.forEach((e) => emailMap.set(e.user_id, e.email));

    const planMap = new Map<string, string>();
    plans?.forEach((p) => planMap.set(p.id, p.name));

    const balanceMap = new Map<string, number>();
    const depositMap = new Map<string, number>();
    const withdrawMap = new Map<string, number>();
    const lockedMap = new Map<string, number>();
    const riskMap = new Map<string, number>();

    allTransactions?.forEach((tx) => {
      balanceMap.set(tx.user_id, (balanceMap.get(tx.user_id) ?? 0) + Number(tx.amount));
      if (tx.type === "deposit") {
        depositMap.set(tx.user_id, (depositMap.get(tx.user_id) ?? 0) + Number(tx.amount));
      }
      if (tx.type === "withdrawal") {
        withdrawMap.set(tx.user_id, (withdrawMap.get(tx.user_id) ?? 0) + Math.abs(Number(tx.amount)));
      }
    });

    activeEntries?.forEach((e) => {
      lockedMap.set(e.user_id, (lockedMap.get(e.user_id) ?? 0) + Number(e.amount));
    });

    riskScores?.forEach((r) => {
      riskMap.set(r.user_id, r.score);
    });

    return profiles.map((p) => ({
      ...p,
      email: emailMap.get(p.user_id) ?? "—",
      balance: balanceMap.get(p.user_id) ?? 0,
      totalDeposited: depositMap.get(p.user_id) ?? 0,
      totalWithdrawn: withdrawMap.get(p.user_id) ?? 0,
      lockedBalance: lockedMap.get(p.user_id) ?? 0,
      riskScore: riskMap.get(p.user_id) ?? 0,
      planName: p.plan_id ? (planMap.get(p.plan_id) ?? "—") : "—",
    }));
  }, [profiles, allTransactions, activeEntries, riskScores, userEmails, plans]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = enrichedUsers.length;
    const kycPending = enrichedUsers.filter((u) => u.kyc_status === "pending").length;
    const frozen = enrichedUsers.filter((u) => u.is_frozen).length;
    const totalAUM = enrichedUsers.reduce((s, u) => s + u.balance, 0);
    const highRisk = enrichedUsers.filter((u) => u.riskScore > 70).length;
    return { total, kycPending, frozen, totalAUM, highRisk };
  }, [enrichedUsers]);

  // Filtering - now also searches by email
  const filtered = useMemo(() => {
    const list = enrichedUsers.filter((u) => {
      if (filterStatus === "active" && u.is_frozen) return false;
      if (filterStatus === "frozen" && !u.is_frozen) return false;
      if (filterKyc !== "all" && u.kyc_status !== filterKyc) return false;
      if (filterRisk === "high" && u.riskScore <= 70) return false;
      if (filterRisk === "medium" && (u.riskScore <= 30 || u.riskScore > 70)) return false;
      if (filterRisk === "low" && u.riskScore > 30) return false;
      if (filterPlan !== "all" && u.planName !== filterPlan) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (u.full_name ?? "").toLowerCase().includes(q) ||
          u.user_id.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.referral_code ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    const sorted = [...list];
    if (sortBy === "balance_desc") sorted.sort((a, b) => b.balance - a.balance);
    else if (sortBy === "balance_asc") sorted.sort((a, b) => a.balance - b.balance);
    else if (sortBy === "deposited") sorted.sort((a, b) => b.totalDeposited - a.totalDeposited);
    else if (sortBy === "risk") sorted.sort((a, b) => b.riskScore - a.riskScore);
    return sorted;
  }, [enrichedUsers, filterStatus, filterKyc, filterRisk, filterPlan, sortBy, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-all-txns"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-active-entries"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-risk-scores"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-emails"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-plans"] });
    toast.success("Refreshed");
  };

  const fmtUsd = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const riskBadge = (score: number) => {
    if (score > 70) return <span className="status-badge-danger">High ({score})</span>;
    if (score > 30) return <span className="status-badge-warning">Med ({score})</span>;
    return <span className="status-badge-success">Low ({score})</span>;
  };

  const kpiCards = [
    { label: "Total Users", value: kpis.total, icon: Users, color: "text-primary" },
    { label: "KYC Pending", value: kpis.kycPending, icon: ShieldCheck, color: "text-warning" },
    { label: "Frozen Accounts", value: kpis.frozen, icon: Ban, color: "text-destructive" },
    { label: "Platform AUM", value: fmtUsd(kpis.totalAUM), icon: DollarSign, color: "text-success" },
    { label: "High Risk", value: kpis.highRisk, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">User Governance</h1>
          <p className="text-sm text-muted-foreground">Monitor, manage, and control platform users</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold font-display">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, ID, or referral code…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Account Status</label>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">KYC Status</label>
              <Select value={filterKyc} onValueChange={(v) => { setFilterKyc(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Risk Level</label>
              <Select value={filterRisk} onValueChange={(v) => { setFilterRisk(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low (0–30)</SelectItem>
                  <SelectItem value="medium">Medium (31–70)</SelectItem>
                  <SelectItem value="high">High (71–100)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </div>

      {/* User Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">KYC</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Balance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Deposited</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.user_id}`)}
                  className="border-b border-border/10 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{u.full_name || "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground sm:hidden">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-medium">{u.planName}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={
                      u.kyc_status === "approved" ? "status-badge-success" :
                      u.kyc_status === "pending" ? "status-badge-warning" : "status-badge-danger"
                    }>{u.kyc_status}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={u.is_frozen ? "status-badge-danger" : "status-badge-success"}>
                      {u.is_frozen ? "Frozen" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={u.balance >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                      {fmtUsd(u.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{fmtUsd(u.totalDeposited)}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">{riskBadge(u.riskScore)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  {loadingProfiles ? "Loading users…" : "No users found."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
                .reduce<(number | "ellipsis")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== i - 1) acc.push("ellipsis");
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button key={item} variant={item === currentPage ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(item)}>
                      {item + 1}
                    </Button>
                  )
                )}
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
