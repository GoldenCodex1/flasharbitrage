import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, RefreshCw, Save, Shield } from "lucide-react";

function maskKey(key: string) {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "•".repeat(Math.min(key.length - 10, 20)) + key.slice(-4);
}

export default function ProviderConfig() {
  const qc = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [showIpn, setShowIpn] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: gateways } = useQuery({
    queryKey: ["api-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("api_gateways").select("*").order("created_at");
      return data ?? [];
    },
  });

  const [selectedGw, setSelectedGw] = useState<string | null>(null);

  const { data: creds, refetch } = useQuery({
    queryKey: ["api-credentials", selectedGw],
    queryFn: async () => {
      if (!selectedGw) return null;
      const { data } = await supabase
        .from("api_credentials")
        .select("*")
        .eq("gateway_id", selectedGw)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedGw,
  });

  useEffect(() => {
    if (gateways && gateways.length > 0 && !selectedGw) {
      setSelectedGw(gateways[0].id);
    }
  }, [gateways, selectedGw]);

  const [form, setForm] = useState({
    encrypted_api_key: "",
    encrypted_ipn_secret: "",
    webhook_secret: "",
    auto_confirm: false,
    allowed_currencies: ["USDT", "BTC", "ETH"],
    allowed_networks: ["TRC20", "ERC20", "BEP20"],
    fee_handling: "user",
    mode: "sandbox",
  });

  useEffect(() => {
    if (creds) {
      setForm({
        encrypted_api_key: creds.encrypted_api_key || "",
        encrypted_ipn_secret: creds.encrypted_ipn_secret || "",
        webhook_secret: creds.webhook_secret || "",
        auto_confirm: creds.auto_confirm,
        allowed_currencies: creds.allowed_currencies || [],
        allowed_networks: creds.allowed_networks || [],
        fee_handling: creds.fee_handling || "user",
        mode: creds.mode || "sandbox",
      });
    }
  }, [creds]);

  const handleSave = async () => {
    if (!creds?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("api_credentials")
      .update({
        encrypted_api_key: form.encrypted_api_key,
        encrypted_ipn_secret: form.encrypted_ipn_secret,
        webhook_secret: form.webhook_secret,
        auto_confirm: form.auto_confirm,
        allowed_currencies: form.allowed_currencies,
        allowed_networks: form.allowed_networks,
        fee_handling: form.fee_handling,
        mode: form.mode,
      })
      .eq("id", creds.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuration saved");
    refetch();
  };

  const rotateWebhookSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secret = "whsec_";
    for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, webhook_secret: secret });
  };

  const allCurrencies = ["USDT", "BTC", "ETH", "BNB", "SOL", "TRX", "MATIC", "LTC"];
  const allNetworks = ["TRC20", "ERC20", "BEP20", "SOL", "Polygon", "Bitcoin"];

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const gwName = gateways?.find((g) => g.id === selectedGw)?.provider_name || "Provider";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "iknyoyblnyenbrfzffxm";
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/nowpayments-webhook`;

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> {gwName} Configuration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure API keys, webhook secrets, and provider settings.
          </p>
        </div>
        {gateways && gateways.length > 1 && (
          <select
            value={selectedGw || ""}
            onChange={(e) => setSelectedGw(e.target.value)}
            className="bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
          >
            {gateways.map((g) => (
              <option key={g.id} value={g.id}>{g.provider_name}</option>
            ))}
          </select>
        )}
      </div>

      {!creds && selectedGw && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No credentials found for this gateway.</p>
          <button
            onClick={async () => {
              const { error } = await supabase.from("api_credentials").insert({ gateway_id: selectedGw });
              if (error) return toast.error(error.message);
              toast.success("Credentials created — you can now configure API keys.");
              refetch();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Initialize Credentials
          </button>
        </div>
      )}

      {creds && (
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={form.encrypted_api_key}
                onChange={(e) => setForm({ ...form, encrypted_api_key: e.target.value })}
                placeholder="Enter API key"
                className="flex-1 bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground font-mono"
              />
              <button onClick={() => setShowKey(!showKey)} className="px-3 py-2 rounded-lg bg-secondary border border-border/30">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* IPN Secret */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">IPN Secret Key</label>
            <div className="flex gap-2">
              <input
                type={showIpn ? "text" : "password"}
                value={form.encrypted_ipn_secret}
                onChange={(e) => setForm({ ...form, encrypted_ipn_secret: e.target.value })}
                placeholder="Enter IPN secret"
                className="flex-1 bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground font-mono"
              />
              <button onClick={() => setShowIpn(!showIpn)} className="px-3 py-2 rounded-lg bg-secondary border border-border/30">
                {showIpn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Webhook URL (Read-Only)</label>
            <input
              value={webhookUrl}
              readOnly
              className="w-full bg-muted border border-border/30 rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono cursor-not-allowed"
            />
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Webhook Secret</label>
            <div className="flex gap-2">
              <input
                value={form.webhook_secret}
                readOnly
                className="flex-1 bg-muted border border-border/30 rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono"
              />
              <button
                onClick={rotateWebhookSecret}
                className="px-3 py-2 rounded-lg bg-secondary border border-border/30 flex items-center gap-1 text-xs"
              >
                <RefreshCw className="w-3 h-3" /> Rotate
              </button>
            </div>
          </div>

          {/* Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fee Handling</label>
              <select
                value={form.fee_handling}
                onChange={(e) => setForm({ ...form, fee_handling: e.target.value })}
                className="w-full bg-secondary border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="user">User Pays</option>
                <option value="platform">Platform Pays</option>
              </select>
            </div>
          </div>

          {/* Auto Confirm */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_confirm}
              onChange={() => setForm({ ...form, auto_confirm: !form.auto_confirm })}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm">Auto Confirm Deposits</span>
          </label>

          {/* Currencies */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Allowed Currencies</label>
            <div className="flex flex-wrap gap-2">
              {allCurrencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, allowed_currencies: toggleArr(form.allowed_currencies, c) })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.allowed_currencies.includes(c)
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary border-border/30 text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Networks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Allowed Networks</label>
            <div className="flex flex-wrap gap-2">
              {allNetworks.map((n) => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, allowed_networks: toggleArr(form.allowed_networks, n) })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.allowed_networks.includes(n)
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-secondary border-border/30 text-muted-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
