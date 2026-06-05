import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Mail, Send, TestTube, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailSettings {
  id: string;
  email_provider: string;
  sender_name: string;
  sender_email: string;
  resend_api_key: string;
  mailgun_api_key: string;
  mailgun_domain: string;
  mailgun_region: string;
  notify_signup: boolean;
  notify_deposit: boolean;
  notify_withdrawal: boolean;
  notify_settlement: boolean;
  signup_subject: string;
  signup_body: string;
  deposit_subject: string;
  deposit_body: string;
  withdrawal_subject: string;
  withdrawal_body: string;
  settlement_subject: string;
  settlement_body: string;
}

const templateInfo = [
  { key: "signup", label: "Signup Welcome", desc: "Sent when a new user registers", vars: "{{name}}" },
  { key: "deposit", label: "Deposit Confirmed", desc: "Sent when a deposit is approved", vars: "{{name}}, {{amount}}, {{currency}}" },
  { key: "withdrawal", label: "Withdrawal Approved", desc: "Sent when a withdrawal is approved", vars: "{{name}}, {{amount}}, {{wallet}}" },
  { key: "settlement", label: "Trade Settlement", desc: "Sent when trade profit is credited", vars: "{{name}}, {{trade_title}}, {{profit}}" },
];

export default function AdminEmailSettings() {
  const [data, setData] = useState<EmailSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: rows } = await supabase.from("email_settings" as any).select("*").limit(1);
    if (rows && rows.length > 0) setData(rows[0] as unknown as EmailSettings);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { id, ...updates } = data;
    const { error } = await supabase.from("email_settings" as any).update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Email settings saved");
    setSaving(false);
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) { toast.error("Not authenticated"); return; }
      
      const { data: res, error } = await supabase.functions.invoke("send-email", {
        body: { type: "signup", user_id: userData.user.id, variables: {} },
      });
      if (error) toast.error("Test failed: " + error.message);
      else if (res?.error) toast.error(res.error);
      else if (res?.skipped) toast.info("Signup notifications are disabled");
      else toast.success("Test email sent!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setTesting(false);
  };

  const update = (field: keyof EmailSettings, value: any) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  if (!data) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded mb-2" />
        <div className="h-4 w-72 bg-secondary/50 rounded" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Email & Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Mailgun email provider, sender identity, and notification templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleTestEmail} disabled={testing}>
            {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1" />}
            Send Test
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Mailgun Provider */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold text-base sm:text-lg flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> Mailgun Provider
        </h3>
        <p className="text-xs text-muted-foreground">
          Enter your Mailgun Private API key and verified sending domain. Get them at{" "}
          <a href="https://app.mailgun.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.mailgun.com</a>.
        </p>

        <div className="space-y-1.5 max-w-md">
          <label className="text-xs font-medium text-muted-foreground">Mailgun API Key</label>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              value={data.mailgun_api_key}
              onChange={(e) => update("mailgun_api_key", e.target.value)}
              className="bg-secondary/50 border-border/30 text-sm pr-10"
              placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sending Domain</label>
            <Input
              value={data.mailgun_domain}
              onChange={(e) => update("mailgun_domain", e.target.value)}
              className="bg-secondary/50 border-border/30 text-sm"
              placeholder="mg.yourdomain.com"
            />
            <p className="text-[10px] text-muted-foreground/70">Must be a verified domain in Mailgun</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Region</label>
            <select
              value={data.mailgun_region || "us"}
              onChange={(e) => update("mailgun_region", e.target.value)}
              className="w-full h-10 rounded-md bg-secondary/50 border border-border/30 text-sm px-3"
            >
              <option value="us">US (api.mailgun.net)</option>
              <option value="eu">EU (api.eu.mailgun.net)</option>
            </select>
          </div>
        </div>

        {(!data.mailgun_api_key || !data.mailgun_domain) && (
          <p className="text-[10px] text-destructive">⚠ Mailgun not fully configured — emails will not be sent.</p>
        )}
      </div>


      {/* Sender Identity */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold text-base sm:text-lg">Sender Identity</h3>
        <p className="text-xs text-muted-foreground">The "From" name and email that recipients see.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sender Name</label>
            <Input value={data.sender_name} onChange={(e) => update("sender_name", e.target.value)} className="bg-secondary/50 border-border/30 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sender Email</label>
            <Input value={data.sender_email} onChange={(e) => update("sender_email", e.target.value)} className="bg-secondary/50 border-border/30 text-sm" placeholder="noreply@yourdomain.com" />
            <p className="text-[10px] text-muted-foreground/70">Must match a verified domain in Mailgun</p>
          </div>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-semibold text-base sm:text-lg">Notification Toggles</h3>
        <p className="text-xs text-muted-foreground">Enable or disable specific email notifications.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: "notify_signup" as const, label: "Signup Welcome" },
            { key: "notify_deposit" as const, label: "Deposit Confirmed" },
            { key: "notify_withdrawal" as const, label: "Withdrawal Approved" },
            { key: "notify_settlement" as const, label: "Trade Settlement" },
          ].map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-2 bg-secondary/30 rounded-lg p-3">
              <span className="text-sm">{t.label}</span>
              <Switch checked={data[t.key]} onCheckedChange={(v) => update(t.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Email Templates */}
      {templateInfo.map((tmpl) => (
        <div key={tmpl.key} className="glass-card p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-base sm:text-lg flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> {tmpl.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{tmpl.desc}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">Available variables: <code className="text-primary">{tmpl.vars}</code></p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
              <Input
                value={data[`${tmpl.key}_subject` as keyof EmailSettings] as string}
                onChange={(e) => update(`${tmpl.key}_subject` as keyof EmailSettings, e.target.value)}
                className="bg-secondary/50 border-border/30 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <Textarea
                value={data[`${tmpl.key}_body` as keyof EmailSettings] as string}
                onChange={(e) => update(`${tmpl.key}_body` as keyof EmailSettings, e.target.value)}
                className="bg-secondary/50 border-border/30 text-sm min-h-[80px]"
              />
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
