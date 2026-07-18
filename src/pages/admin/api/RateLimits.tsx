import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ShieldAlert } from "lucide-react";

export default function RateLimits() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: gateways } = useQuery({
    queryKey: ["api-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("api_gateways").select("*").order("created_at");
      return data ?? [];
    },
  });

  const gw = gateways?.[0];

  const [form, setForm] = useState({
    max_calls_per_minute: 60,
    max_failures_before_disable: 3,
    auto_disable: true,
  });

  useEffect(() => {
    if (gw) {
      setForm({
        max_calls_per_minute: gw.max_calls_per_minute,
        max_failures_before_disable: gw.max_failures_before_disable,
        auto_disable: gw.auto_disable,
      });
    }
  }, [gw]);

  const handleSave = async () => {
    if (!gw) return;
    setSaving(true);
    const { error } = await supabase
      .from("api_gateways")
      .update({
        max_calls_per_minute: form.max_calls_per_minute,
        max_failures_before_disable: form.max_failures_before_disable,
        auto_disable: form.auto_disable,
      })
      .eq("id", gw.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Rate limits updated");
    qc.invalidateQueries({ queryKey: ["api-gateways"] });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-warning" /> Rate Limits & Safety Controls
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure fail-safe mechanisms and API rate limiting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Max API Calls / Minute</label>
          <input
            type="number"
            value={form.max_calls_per_minute}
            onChange={(e) => setForm({ ...form, max_calls_per_minute: Number(e.target.value) })}
            className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Failures Before Disable</label>
          <input
            type="number"
            value={form.max_failures_before_disable}
            onChange={(e) => setForm({ ...form, max_failures_before_disable: Number(e.target.value) })}
            className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_disable}
              onChange={() => setForm({ ...form, auto_disable: !form.auto_disable })}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm">Auto-Disable Gateway on Failure</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !gw}
        className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Controls"}
      </button>
    </div>
  );
}
