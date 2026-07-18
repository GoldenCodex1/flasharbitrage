import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Save, Plus, Trash2, Users, Settings } from "lucide-react";

export default function AdminReferrals() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "config" | "special">("overview");

  // Referral list
  const { data: referrals } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Referral config
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ["referral-config"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_config").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  // Commission log with levels
  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_commissions").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // Custom referral configs
  const { data: customConfigs, refetch: refetchCustom } = useQuery({
    queryKey: ["custom-referral-configs"],
    queryFn: async () => {
      const { data } = await supabase.from("custom_referral_config" as any).select("*").order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // User emails for display
  const { data: emails } = useQuery({
    queryKey: ["user-emails"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_emails");
      return data ?? [];
    },
  });

  const emailMap = new Map((emails ?? []).map((e: any) => [e.user_id, e.email]));

  const totalCommission = referrals?.reduce((s, r) => s + Number(r.total_commission), 0) ?? 0;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  // Config form state
  const [configForm, setConfigForm] = useState<any>(null);
  const initConfigForm = () => {
    if (config && !configForm) {
      setConfigForm({
        level1_commission_percent: config.level1_commission_percent ?? config.default_commission_percent ?? 5,
        level2_commission_percent: config.level2_commission_percent ?? 2,
        level3_commission_percent: config.level3_commission_percent ?? 1,
        multi_level_enabled: config.multi_level_enabled ?? false,
        max_commission_per_deposit: config.max_commission_per_deposit ?? 500,
        referral_bonus_cap: config.referral_bonus_cap ?? 1000,
      });
    }
  };

  if (config && !configForm) initConfigForm();

  const saveConfig = async () => {
    if (!config || !configForm) return;
    const { error } = await supabase.from("referral_config").update({
      level1_commission_percent: configForm.level1_commission_percent,
      default_commission_percent: configForm.level1_commission_percent,
      level2_commission_percent: configForm.level2_commission_percent,
      level3_commission_percent: configForm.level3_commission_percent,
      multi_level_enabled: configForm.multi_level_enabled,
      max_commission_per_deposit: configForm.max_commission_per_deposit,
      referral_bonus_cap: configForm.referral_bonus_cap,
    } as any).eq("id", config.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Referral config saved");
      refetchConfig();
    }
  };

  // Special user form
  const [newSpecialUser, setNewSpecialUser] = useState({ user_id: "", l1: "5", l2: "2", l3: "1" });

  const addSpecialUser = async () => {
    if (!newSpecialUser.user_id) { toast.error("Select a user"); return; }
    const { error } = await supabase.from("custom_referral_config" as any).upsert({
      user_id: newSpecialUser.user_id,
      level1_percent: Number(newSpecialUser.l1),
      level2_percent: Number(newSpecialUser.l2),
      level3_percent: Number(newSpecialUser.l3),
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Special referral rate assigned");
      setNewSpecialUser({ user_id: "", l1: "5", l2: "2", l3: "1" });
      refetchCustom();
    }
  };

  const removeSpecialUser = async (id: string) => {
    const { error } = await supabase.from("custom_referral_config" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Special rate removed");
      refetchCustom();
    }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: Users },
    { key: "config", label: "Commission Rates", icon: Settings },
    { key: "special", label: "Special Users", icon: Plus },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-xl sm:text-2xl">Referrals</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total Referrals</p>
          <p className="text-2xl font-display font-bold mt-1">{referrals?.length ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total Commission Paid</p>
          <p className="text-2xl font-display font-bold mt-1">{fmt(totalCommission)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Multi-Level</p>
          <p className="text-2xl font-display font-bold mt-1">{config?.multi_level_enabled ? "Enabled" : "Disabled"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Referral Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="font-display font-semibold text-sm">Referral Pairs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Referrer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Referred</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Total Earned</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals && referrals.length > 0 ? referrals.map((r) => (
                    <tr key={r.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-xs">{emailMap.get(r.referrer_id) || r.referrer_id.slice(0, 8) + "..."}</td>
                      <td className="px-4 py-3 text-xs">{emailMap.get(r.referred_id) || r.referred_id.slice(0, 8) + "..."}</td>
                      <td className="px-4 py-3 font-semibold text-success">{fmt(Number(r.total_commission))}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No referrals yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commission Log */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="font-display font-semibold text-sm">Commission Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Earner</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Level</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions && commissions.length > 0 ? commissions.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-xs">{emailMap.get(c.referrer_id) || c.referrer_id.slice(0, 8) + "..."}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.level === 1 ? 'bg-primary/20 text-primary' : c.level === 2 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>L{c.level || 1}</span></td>
                      <td className="px-4 py-3 font-semibold text-success">{fmt(Number(c.commission_amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No commissions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === "config" && configForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm">Default Commission Rates</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={configForm.multi_level_enabled}
              onChange={(e) => setConfigForm({ ...configForm, multi_level_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-border/30"
            />
            <span className="text-sm">Enable Multi-Level Referrals (3 levels)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Level 1 %</label>
              <input type="number" step="0.1" value={configForm.level1_commission_percent} onChange={(e) => setConfigForm({ ...configForm, level1_commission_percent: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Level 2 %</label>
              <input type="number" step="0.1" value={configForm.level2_commission_percent} onChange={(e) => setConfigForm({ ...configForm, level2_commission_percent: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" disabled={!configForm.multi_level_enabled} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Level 3 %</label>
              <input type="number" step="0.1" value={configForm.level3_commission_percent} onChange={(e) => setConfigForm({ ...configForm, level3_commission_percent: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" disabled={!configForm.multi_level_enabled} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max Commission Per Deposit ($)</label>
              <input type="number" value={configForm.max_commission_per_deposit} onChange={(e) => setConfigForm({ ...configForm, max_commission_per_deposit: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Referral Bonus Cap ($)</label>
              <input type="number" value={configForm.referral_bonus_cap} onChange={(e) => setConfigForm({ ...configForm, referral_bonus_cap: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <button onClick={saveConfig} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" /> Save Config
          </button>
        </div>
      )}

      {/* Special Users Tab */}
      {activeTab === "special" && (
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm">Assign Special Commission Rate</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">User</label>
              <select
                value={newSpecialUser.user_id}
                onChange={(e) => setNewSpecialUser({ ...newSpecialUser, user_id: e.target.value })}
                className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select user...</option>
                {(emails ?? []).map((e: any) => (
                  <option key={e.user_id} value={e.user_id}>{e.email}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">L1 %</label>
                <input type="number" step="0.1" value={newSpecialUser.l1} onChange={(e) => setNewSpecialUser({ ...newSpecialUser, l1: e.target.value })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">L2 %</label>
                <input type="number" step="0.1" value={newSpecialUser.l2} onChange={(e) => setNewSpecialUser({ ...newSpecialUser, l2: e.target.value })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">L3 %</label>
                <input type="number" step="0.1" value={newSpecialUser.l3} onChange={(e) => setNewSpecialUser({ ...newSpecialUser, l3: e.target.value })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={addSpecialUser} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Assign Special Rate
            </button>
          </div>

          {/* Existing special users */}
          {customConfigs && customConfigs.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <h3 className="font-display font-semibold text-sm">Special Rate Users</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">L1 %</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">L2 %</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">L3 %</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customConfigs.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-xs">{emailMap.get(c.user_id) || c.user_id.slice(0, 8) + "..."}</td>
                        <td className="px-4 py-3">{c.level1_percent}%</td>
                        <td className="px-4 py-3">{c.level2_percent}%</td>
                        <td className="px-4 py-3">{c.level3_percent}%</td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeSpecialUser(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
