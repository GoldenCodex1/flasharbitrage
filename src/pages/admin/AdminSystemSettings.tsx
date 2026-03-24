import { motion } from "framer-motion";
import { Server, DollarSign, Gift, Bot, Shield, Cpu } from "lucide-react";
import InfraSection from "./system/InfraSection";
import ConfigField from "./system/ConfigField";

export default function AdminSystemSettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl sm:text-2xl">Platform Infrastructure Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Core system configuration — changes apply platform-wide.</p>
      </div>

      {/* 1 — Platform Core */}
      <InfraSection title="Platform Core Settings" description="Core platform identity and access controls." table="system_config" sectionKey="system_config">
        {(data: any, update) => (
          <>
            <ConfigField label="Platform Name" type="text" value={data.platform_name} onChange={(v) => update("platform_name", v)} />
            <ConfigField label="Maintenance Mode" type="toggle" value={data.maintenance_mode} onChange={(v) => update("maintenance_mode", v)} hint="Disables all user access when enabled" />
            <ConfigField label="Registration Enabled" type="toggle" value={data.registration_enabled} onChange={(v) => update("registration_enabled", v)} />
            <ConfigField label="KYC Required" type="toggle" value={data.kyc_required} onChange={(v) => update("kyc_required", v)} />
            <ConfigField label="Email Verification Required" type="toggle" value={data.email_verification_required} onChange={(v) => update("email_verification_required", v)} />
            <ConfigField label="Session Timeout" type="number" value={data.session_timeout_minutes} onChange={(v) => update("session_timeout_minutes", Number(v))} suffix="min" />
          </>
        )}
      </InfraSection>

      {/* 2 — Financial Rules */}
      <InfraSection title="Financial Rules" description="Deposit, withdrawal, and fee configuration." table="system_financial_rules" sectionKey="financial_rules">
        {(data: any, update) => (
          <>
            <ConfigField label="Minimum Deposit" type="number" value={data.min_deposit} onChange={(v) => update("min_deposit", Number(v))} suffix="$" />
            <ConfigField label="Minimum Withdrawal" type="number" value={data.min_withdrawal} onChange={(v) => update("min_withdrawal", Number(v))} suffix="$" />
            <ConfigField label="Withdrawal Fee" type="number" value={data.withdrawal_fee_percent} onChange={(v) => update("withdrawal_fee_percent", Number(v))} suffix="%" />
            <ConfigField label="Deposit Confirmation Required" type="toggle" value={data.deposit_confirmation_required} onChange={(v) => update("deposit_confirmation_required", v)} />
            <ConfigField label="Manual Withdrawal Approval" type="toggle" value={data.manual_withdrawal_approval} onChange={(v) => update("manual_withdrawal_approval", v)} />
            <ConfigField label="Min Auto Deposit (USD)" type="number" value={data.min_auto_deposit} onChange={(v) => update("min_auto_deposit", Number(v))} suffix="$" hint="Minimum amount for automatic crypto deposits" />
          </>
        )}
      </InfraSection>

      {/* 3 — Referral Config */}
      <InfraSection title="Referral Configuration" description="Default referral rewards and multi-level settings." table="referral_config" sectionKey="referral_config">
        {(data: any, update) => (
          <>
            <ConfigField label="Default Commission" type="number" value={data.default_commission_percent} onChange={(v) => update("default_commission_percent", Number(v))} suffix="%" />
            <ConfigField label="Multi-Level Referral" type="toggle" value={data.multi_level_enabled} onChange={(v) => update("multi_level_enabled", v)} />
            <ConfigField label="Level 2 Commission" type="number" value={data.level2_commission_percent} onChange={(v) => update("level2_commission_percent", Number(v))} suffix="%" />
            <ConfigField label="Referral Bonus Cap" type="number" value={data.referral_bonus_cap} onChange={(v) => update("referral_bonus_cap", Number(v))} suffix="$" />
          </>
        )}
      </InfraSection>

      {/* 4 — Default Bot Settings */}
      <InfraSection title="Default Bot Settings" description="Applied to new users only — does not override live bot controls." table="bot_default_config" sectionKey="bot_default_config">
        {(data: any, update) => (
          <>
            <ConfigField label="Default Risk Level" type="select" value={data.default_risk_level} options={[
              { label: "Conservative", value: "conservative" },
              { label: "Moderate", value: "moderate" },
              { label: "Aggressive", value: "aggressive" },
            ]} onChange={(v) => update("default_risk_level", v)} />
            <ConfigField label="Daily Trade Cap" type="number" value={data.default_daily_trade_cap} onChange={(v) => update("default_daily_trade_cap", Number(v))} />
            <ConfigField label="Capital Allocation" type="number" value={data.default_capital_allocation_percent} onChange={(v) => update("default_capital_allocation_percent", Number(v))} suffix="%" />
            <ConfigField label="Max Exposure" type="number" value={data.default_max_exposure_percent} onChange={(v) => update("default_max_exposure_percent", Number(v))} suffix="%" />
          </>
        )}
      </InfraSection>

      {/* 5 — Security Settings */}
      <InfraSection title="Security Settings" description="Authentication and access protection rules." table="security_config" sectionKey="security_config">
        {(data: any, update) => (
          <>
            <ConfigField label="Require 2FA" type="toggle" value={data.two_factor_required} onChange={(v) => update("two_factor_required", v)} />
            <ConfigField label="Max Login Attempts" type="number" value={data.max_login_attempts} onChange={(v) => update("max_login_attempts", Number(v))} />
            <ConfigField label="IP Lock" type="toggle" value={data.ip_lock_enabled} onChange={(v) => update("ip_lock_enabled", v)} />
            <ConfigField label="Admin IP Whitelist" type="text" value={data.admin_ip_whitelist} onChange={(v) => update("admin_ip_whitelist", v)} hint="Comma-separated IPs" />
            <ConfigField label="Withdrawal Cooldown" type="number" value={data.withdrawal_cooldown_hours} onChange={(v) => update("withdrawal_cooldown_hours", Number(v))} suffix="hrs" />
          </>
        )}
      </InfraSection>

      {/* 6 — API & Engine */}
      <InfraSection title="API & Engine Settings" description="Exchange connectivity and sync configuration." table="engine_config" sectionKey="engine_config">
        {(data: any, update) => (
          <>
            <ConfigField label="Exchange API Status" type="select" value={data.exchange_api_status} options={[
              { label: "Connected", value: "connected" },
              { label: "Disconnected", value: "disconnected" },
              { label: "Error", value: "error" },
            ]} onChange={(v) => update("exchange_api_status", v)} />
            <ConfigField label="Auto-Sync Interval" type="number" value={data.auto_sync_interval_seconds} onChange={(v) => update("auto_sync_interval_seconds", Number(v))} suffix="sec" />
            <ConfigField label="WebSocket Enabled" type="toggle" value={data.websocket_enabled} onChange={(v) => update("websocket_enabled", v)} />
          </>
        )}
      </InfraSection>
    </motion.div>
  );
}
