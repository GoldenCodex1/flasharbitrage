import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface Plan {
  id: string;
  name: string;
  description: string;
  max_trades_per_day: number;
  max_trade_amount: number;
  max_auto_trade_slots: number;
  daily_withdrawal_limit: number;
  monthly_price: number;
  is_active: boolean;
  duration_days: number | null;
  upgrade_price: number;
  is_free_plan: boolean;
}

const emptyPlan: Omit<Plan, "id"> = {
  name: "",
  description: "",
  max_trades_per_day: 5,
  max_trade_amount: 100,
  max_auto_trade_slots: 1,
  daily_withdrawal_limit: 500,
  monthly_price: 0,
  is_active: true,
};

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Plan, "id">>(emptyPlan);
  const [saving, setSaving] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").order("monthly_price", { ascending: true });
      return (data ?? []) as Plan[];
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlan);
    setCreating(true);
  };

  const openEdit = (plan: Plan) => {
    setCreating(false);
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      max_trades_per_day: plan.max_trades_per_day,
      max_trade_amount: plan.max_trade_amount,
      max_auto_trade_slots: plan.max_auto_trade_slots,
      daily_withdrawal_limit: plan.daily_withdrawal_limit,
      monthly_price: plan.monthly_price,
      is_active: plan.is_active,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);

    if (creating) {
      const { error } = await supabase.from("plans").insert(form as any);
      if (error) toast.error(error.message);
      else { toast.success("Plan created"); setCreating(false); }
    } else if (editing) {
      const { error } = await supabase.from("plans").update(form as any).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Plan updated"); setEditing(null); }
    }

    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  const toggleActive = async (plan: Plan) => {
    if (plan.name === "FREE") { toast.error("FREE plan cannot be disabled"); return; }
    const { error } = await supabase.from("plans").update({ is_active: !plan.is_active } as any).eq("id", plan.id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
  };

  const deletePlan = async (plan: Plan) => {
    if (plan.name === "FREE") { toast.error("FREE plan cannot be deleted"); return; }
    if (!confirm(`Delete plan "${plan.name}"? Existing users will keep it.`)) return;
    const { error } = await supabase.from("plans").delete().eq("id", plan.id);
    if (error) toast.error(error.message);
    else { toast.success("Plan deleted"); queryClient.invalidateQueries({ queryKey: ["admin-plans"] }); }
  };

  const fmt = (n: number) => n >= 999999 ? "Unlimited" : n.toLocaleString();
  const fmtPrice = (n: number) => n === 0 ? "Free" : `$${n.toFixed(2)}/mo`;

  const showForm = creating || editing;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl">Plan Management</h1>
          <p className="text-xs text-muted-foreground mt-1">Create and manage subscription tiers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </motion.div>

      {/* Plan Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <div key={plan.id} className={`glass-card p-5 flex flex-col gap-3 ${!plan.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold">{plan.name}</h3>
              </div>
              <span className={plan.is_active ? "status-badge-success" : "status-badge-danger"}>
                {plan.is_active ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
            <p className="text-2xl font-display font-bold text-primary">{fmtPrice(Number(plan.monthly_price))}</p>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Daily Trades</span><span>{fmt(plan.max_trades_per_day)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max Trade Amount</span><span>${fmt(plan.max_trade_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Auto Bot Slots</span><span>{fmt(plan.max_auto_trade_slots)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Daily Withdrawal</span><span>${fmt(plan.daily_withdrawal_limit)}</span></div>
            </div>

            <div className="flex gap-2 mt-auto pt-3 border-t border-border/30">
              <button onClick={() => openEdit(plan)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => toggleActive(plan)} className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                {plan.is_active ? "Disable" : "Enable"}
              </button>
              {plan.name !== "FREE" && (
                <button onClick={() => deletePlan(plan)} className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Edit/Create Form */}
      {showForm && (
        <motion.div variants={item} className="glass-card p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">{creating ? "Create Plan" : `Edit: ${editing?.name}`}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Plan Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" disabled={editing?.name === "FREE"} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Monthly Price ($)</label>
              <input type="number" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Max Trades Per Day</label>
              <input type="number" value={form.max_trades_per_day} onChange={(e) => setForm({ ...form, max_trades_per_day: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Max Trade Amount ($)</label>
              <input type="number" value={form.max_trade_amount} onChange={(e) => setForm({ ...form, max_trade_amount: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Auto Bot Slots</label>
              <input type="number" value={form.max_auto_trade_slots} onChange={(e) => setForm({ ...form, max_auto_trade_slots: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Daily Withdrawal Limit ($)</label>
              <input type="number" value={form.daily_withdrawal_limit} onChange={(e) => setForm({ ...form, daily_withdrawal_limit: Number(e.target.value) })} className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            <label className="text-sm">Active</label>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : creating ? "Create Plan" : "Save Changes"}
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); }} className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
