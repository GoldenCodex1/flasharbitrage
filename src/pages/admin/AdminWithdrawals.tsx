import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { Copy, Eye, CheckCircle2, XCircle, Banknote, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Withdrawal = {
  id: string;
  user_id: string;
  currency: string;
  network: string | null;
  wallet_address: string;
  amount: number;
  withdrawal_fee: number;
  status: string;
  tx_hash: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  processed_by_admin: string | null;
};

type Filter = "pending" | "approved" | "paid" | "completed" | "rejected" | "all";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  paid: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AdminWithdrawals() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [txInput, setTxInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showTxField, setShowTxField] = useState(false);

  const { data: withdrawals } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      let q = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return (data ?? []) as Withdrawal[];
    },
  });

  const selected = withdrawals?.find((w) => w.id === selectedId) ?? null;

  // Fetch user profile for selected withdrawal
  const { data: userProfile } = useQuery({
    queryKey: ["admin-withdrawal-user", selected?.user_id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", selected!.user_id)
        .single();
      return data;
    },
  });

  // Fetch user balance
  const { data: userBalance } = useQuery({
    queryKey: ["admin-withdrawal-balance", selected?.user_id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", selected!.user_id);
      if (!data) return 0;
      return data.reduce((acc, t) => {
        const credit = ["deposit", "trade_return", "profit", "refund", "adjustment", "referral_bonus"].includes(t.type);
        return acc + (credit ? Number(t.amount) : -Number(t.amount));
      }, 0);
    },
  });

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  const logAction = async (withdrawalId: string, action: string, oldVal?: string, newVal?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_action_logs").insert({
      admin_id: user?.id ?? null,
      section: "withdrawals",
      field_name: action,
      old_value: oldVal ?? null,
      new_value: newVal ?? null,
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });

  const handleApprove = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }
    const { data, error } = await supabase.rpc("approve_withdrawal", {
      _withdrawal_id: id,
      _admin_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    const result = data as unknown as { success: boolean; error?: string };
    if (!result.success) { toast.error(result.error ?? "Approval failed"); return; }
    toast.success("Withdrawal approved — balance deducted from user ledger");
    invalidate();
    queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-balance"] });
  };

  const handleStatusChange = async (id: string, newStatus: string, extra?: Record<string, unknown>) => {
    const w = withdrawals?.find((x) => x.id === id);
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Record<string, unknown> = {
      status: newStatus,
      ...(newStatus !== "pending" && newStatus !== "rejected" ? { processed_at: new Date().toISOString(), processed_by_admin: user?.id } : {}),
      ...extra,
    };
    const { error } = await supabase.from("withdrawals").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAction(id, `status_${newStatus}`, w?.status, newStatus);
    toast.success(`Withdrawal ${newStatus}`);
    invalidate();
  };

  const handleMarkPaid = async () => {
    if (!selectedId || !txInput.trim()) { toast.error("Transaction hash is required"); return; }
    await handleStatusChange(selectedId, "paid", { tx_hash: txInput.trim() });
    await logAction(selectedId, "tx_hash_added", null, txInput.trim());
    setTxInput("");
    setShowTxField(false);
  };

  const handleSaveNote = async () => {
    if (!selectedId) return;
    const w = withdrawals?.find((x) => x.id === selectedId);
    const { error } = await supabase.from("withdrawals").update({ admin_note: noteInput }).eq("id", selectedId);
    if (error) { toast.error(error.message); return; }
    await logAction(selectedId, "admin_note", w?.admin_note ?? "", noteInput);
    toast.success("Note saved");
    invalidate();
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Wallet address copied");
  };

  const netAmount = (w: Withdrawal) => Number(w.amount) - Number(w.withdrawal_fee);

  const openDetail = (w: Withdrawal) => {
    setSelectedId(w.id);
    setNoteInput(w.admin_note ?? "");
    setTxInput(w.tx_hash ?? "");
    setShowTxField(false);
  };

  const filters: Filter[] = ["pending", "approved", "paid", "completed", "rejected", "all"];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Withdrawal Management</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["ID", "User", "Currency", "Network", "Requested", "Net Amount", "Status", "Requested", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals && withdrawals.length > 0 ? withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{w.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{w.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{w.currency}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.network ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(Number(w.amount))}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{fmt(netAmount(w))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[w.status] ?? "bg-secondary text-muted-foreground"}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(w.created_at), "MMM dd, HH:mm")}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(w)} className="gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No withdrawals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Withdrawal Detail
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{selected.user_id}</span></div>
                  <div><span className="text-muted-foreground">Name:</span> {userProfile?.full_name || "—"}</div>
                  <div><span className="text-muted-foreground">KYC:</span> <Badge variant="outline">{userProfile?.kyc_status ?? "unknown"}</Badge></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-semibold">{fmt(userBalance ?? 0)}</span></div>
                </div>
              </div>

              <Separator />

              {/* Withdrawal Details */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Withdrawal Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{selected.id}</span></div>
                  <div><span className="text-muted-foreground">Currency:</span> {selected.currency}</div>
                  <div><span className="text-muted-foreground">Network:</span> {selected.network ?? "—"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[selected.status] ?? ""}`}>{selected.status}</span></div>
                  <div><span className="text-muted-foreground">Requested:</span> <span className="font-semibold">{fmt(Number(selected.amount))}</span></div>
                  <div><span className="text-muted-foreground">Fee:</span> {fmt(Number(selected.withdrawal_fee))}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Net To Send:</span> <span className="font-bold text-primary text-lg">{fmt(netAmount(selected))}</span></div>
                </div>

                {/* Wallet Address */}
                <div className="mt-3 flex items-center gap-2 bg-secondary/50 rounded-lg p-3 border border-border/30">
                  <span className="text-xs text-muted-foreground">Wallet:</span>
                  <code className="font-mono text-xs flex-1 break-all">{selected.wallet_address}</code>
                  <Button variant="outline" size="sm" onClick={() => copyAddr(selected.wallet_address)} className="shrink-0 gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>

                {selected.tx_hash && (
                  <div className="mt-3 flex items-center gap-2 bg-secondary/50 rounded-lg p-3 border border-border/30">
                    <span className="text-xs text-muted-foreground">TX Hash:</span>
                    <code className="font-mono text-xs flex-1 break-all">{selected.tx_hash}</code>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(selected.tx_hash!); toast.success("TX hash copied"); }} className="shrink-0 gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Timing */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Timing</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Requested:</span> {format(new Date(selected.created_at), "PPpp")}</div>
                  <div><span className="text-muted-foreground">Processed:</span> {selected.processed_at ? format(new Date(selected.processed_at), "PPpp") : "—"}</div>
                </div>
              </div>

              <Separator />

              {/* Admin Controls */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Admin Controls</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selected.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(selected.id)} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selected.id, "rejected")} className="gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {selected.status === "approved" && (
                    <Button size="sm" onClick={() => setShowTxField(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                      <Banknote className="h-3.5 w-3.5" /> Mark As Paid
                    </Button>
                  )}
                  {selected.status === "paid" && (
                    <Button size="sm" onClick={() => handleStatusChange(selected.id, "completed")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                    </Button>
                  )}
                </div>

                {/* TX Hash Input */}
                {showTxField && selected.status === "approved" && (
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={txInput}
                      onChange={(e) => setTxInput(e.target.value)}
                      placeholder="Enter blockchain transaction hash..."
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={handleMarkPaid}>Save & Mark Paid</Button>
                  </div>
                )}

                {/* Admin Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Admin Notes
                  </label>
                  <Textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add internal notes about this withdrawal..."
                    rows={3}
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveNote}>Save Note</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
