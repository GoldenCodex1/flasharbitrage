import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, RefreshCw, Archive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const WALLET_TYPE_COLORS: Record<string, string> = {
  hot: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reserve: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const USAGE_LABELS: Record<string, string> = {
  deposit: "Deposit Only",
  withdrawal: "Withdrawal Only",
  both: "Deposit & Withdrawal",
};

export default function WalletRegistry() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    currency: "USDT",
    network: "TRC20",
    address: "",
    wallet_type: "hot",
    usage_type: "both",
    min_deposit: "10",
  });

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.address || !form.name) {
      toast.error("Name and address are required");
      return;
    }
    const { error } = await supabase.from("wallets").insert({
      name: form.name,
      currency: form.currency,
      network: form.network,
      address: form.address,
      wallet_type: form.wallet_type,
      usage_type: form.usage_type,
      min_deposit: Number(form.min_deposit),
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Wallet created");
      setShowForm(false);
      setForm({ name: "", currency: "USDT", network: "TRC20", address: "", wallet_type: "hot", usage_type: "both", min_deposit: "10" });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from("wallets")
      .update({ archived_at: new Date().toISOString(), is_active: false } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Wallet archived");
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("wallets").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(current ? "Wallet disabled" : "Wallet enabled");
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    }
  };

  const inputCls = "bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground w-full";

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg">Platform Wallet Registry</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage platform-controlled wallets for deposits, withdrawals, and liquidity reserves.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => qc.invalidateQueries({ queryKey: ["admin-wallets"] })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Wallet
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="border border-border/30 rounded-xl p-4 space-y-3 bg-secondary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder="Wallet Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}>
              <option>USDT</option><option>BTC</option><option>ETH</option><option>BNB</option>
            </select>
            <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className={inputCls}>
              <option>TRC20</option><option>ERC20</option><option>BEP20</option><option>Bitcoin</option><option>Ethereum</option>
            </select>
            <select value={form.wallet_type} onChange={(e) => setForm({ ...form, wallet_type: e.target.value })} className={inputCls}>
              <option value="hot">Hot Wallet</option><option value="cold">Cold Wallet</option><option value="reserve">Reserve Wallet</option>
            </select>
            <select value={form.usage_type} onChange={(e) => setForm({ ...form, usage_type: e.target.value })} className={inputCls}>
              <option value="both">Deposit & Withdrawal</option><option value="deposit">Deposit Only</option><option value="withdrawal">Withdrawal Only</option>
            </select>
            <input placeholder="Min Deposit" type="number" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: e.target.value })} className={inputCls} />
            <input placeholder="Wallet Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputCls} sm:col-span-2 lg:col-span-3 font-mono`} />
          </div>
          <Button size="sm" onClick={handleCreate}>Save Wallet</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {["Name", "Currency", "Network", "Address", "Type", "Usage", "Balance", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wallets?.map((w: any) => (
              <tr key={w.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">{w.name || "—"}</td>
                <td className="px-3 py-2.5">{w.currency}</td>
                <td className="px-3 py-2.5">{w.network}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground max-w-[140px] truncate">{w.address}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${WALLET_TYPE_COLORS[w.wallet_type] || ""}`}>
                    {w.wallet_type?.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs">{USAGE_LABELS[w.usage_type] || w.usage_type}</td>
                <td className="px-3 py-2.5 font-mono">${Number(w.balance || 0).toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={w.is_active ? "default" : "destructive"} className="text-[10px]">
                    {w.is_active ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleActive(w.id, w.is_active)} className="text-xs text-primary hover:underline">
                      {w.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => handleArchive(w.id)} className="text-xs text-destructive hover:underline flex items-center gap-0.5">
                      <Archive className="w-3 h-3" /> Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!wallets || wallets.length === 0) && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No wallets configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
