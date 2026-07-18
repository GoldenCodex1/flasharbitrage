import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  connected: "status-badge-success",
  disconnected: "status-badge-pending",
  error: "status-badge-danger",
  warning: "status-badge-warning",
};

const webhookColors: Record<string, string> = {
  active: "status-badge-success",
  failing: "status-badge-danger",
  not_verified: "status-badge-pending",
};

export default function GatewayRegistry() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider_name: "", environment: "sandbox" });

  const { data: gateways, isLoading } = useQuery({
    queryKey: ["api-gateways"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_gateways")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!form.provider_name) return toast.error("Provider name required");
    const { error } = await supabase.from("api_gateways").insert({
      provider_name: form.provider_name,
      environment: form.environment,
    });
    if (error) return toast.error(error.message);
    // Also create empty credentials row
    const { data: gw } = await supabase
      .from("api_gateways")
      .select("id")
      .eq("provider_name", form.provider_name)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (gw) {
      await supabase.from("api_credentials").insert({ gateway_id: gw.id });
    }
    toast.success("Gateway added");
    setShowForm(false);
    setForm({ provider_name: "", environment: "sandbox" });
    qc.invalidateQueries({ queryKey: ["api-gateways"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("api_gateways")
      .update({ active: !current })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(current ? "Gateway disabled" : "Gateway enabled");
    qc.invalidateQueries({ queryKey: ["api-gateways"] });
  };

  const deleteGateway = async (id: string) => {
    if (!confirm("Delete this gateway? This cannot be undone.")) return;
    const { error } = await supabase.from("api_gateways").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gateway deleted");
    qc.invalidateQueries({ queryKey: ["api-gateways"] });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">Payment Gateway Registry</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage external payment providers for deposits & processing.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {showForm && (
        <div className="p-4 rounded-lg bg-secondary/50 border border-border/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Provider Name (e.g. NOWPayments)"
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
            />
            <select
              value={form.environment}
              onChange={(e) => setForm({ ...form, environment: e.target.value })}
              className="bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Gateway
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Environment</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Webhook</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Failures</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Check</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Active</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {gateways?.map((gw) => (
              <tr key={gw.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 font-medium">{gw.provider_name}</td>
                <td className="px-4 py-3">
                  <span className={gw.environment === "live" ? "status-badge-warning" : "status-badge-info"}>
                    {gw.environment}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={statusColors[gw.status] || "status-badge-pending"}>{gw.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={webhookColors[gw.webhook_status] || "status-badge-pending"}>
                    {gw.webhook_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{gw.consecutive_failures}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {gw.last_health_check
                    ? new Date(gw.last_health_check).toLocaleString()
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  <span className={gw.active ? "status-badge-success" : "status-badge-danger"}>
                    {gw.active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(gw.id, gw.active)}
                      className="text-xs hover:underline flex items-center gap-1"
                      style={{ color: gw.active ? "hsl(var(--destructive))" : "hsl(var(--success))" }}
                    >
                      {gw.active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                      {gw.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteGateway(gw.id)}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && (!gateways || gateways.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No payment gateways configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
