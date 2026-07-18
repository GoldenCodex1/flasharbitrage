
-- System core config (single-row)
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'ArbAI',
  maintenance_mode boolean NOT NULL DEFAULT false,
  registration_enabled boolean NOT NULL DEFAULT true,
  kyc_required boolean NOT NULL DEFAULT true,
  email_verification_required boolean NOT NULL DEFAULT true,
  session_timeout_minutes integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage system_config" ON public.system_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Financial rules (single-row)
CREATE TABLE public.system_financial_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_deposit numeric NOT NULL DEFAULT 10,
  min_withdrawal numeric NOT NULL DEFAULT 20,
  withdrawal_fee_percent numeric NOT NULL DEFAULT 1.0,
  deposit_confirmation_required boolean NOT NULL DEFAULT true,
  manual_withdrawal_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_financial_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage financial_rules" ON public.system_financial_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Referral config (single-row)
CREATE TABLE public.referral_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_commission_percent numeric NOT NULL DEFAULT 1.0,
  multi_level_enabled boolean NOT NULL DEFAULT false,
  level2_commission_percent numeric NOT NULL DEFAULT 0.5,
  referral_bonus_cap numeric NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage referral_config" ON public.referral_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bot default config for new users (single-row)
CREATE TABLE public.bot_default_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_risk_level text NOT NULL DEFAULT 'moderate',
  default_daily_trade_cap integer NOT NULL DEFAULT 15,
  default_capital_allocation_percent numeric NOT NULL DEFAULT 50,
  default_max_exposure_percent numeric NOT NULL DEFAULT 80,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_default_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bot_default_config" ON public.bot_default_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Security config (single-row)
CREATE TABLE public.security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  two_factor_required boolean NOT NULL DEFAULT false,
  max_login_attempts integer NOT NULL DEFAULT 5,
  ip_lock_enabled boolean NOT NULL DEFAULT false,
  admin_ip_whitelist text NOT NULL DEFAULT '',
  withdrawal_cooldown_hours integer NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage security_config" ON public.security_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Engine config (single-row)
CREATE TABLE public.engine_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_api_status text NOT NULL DEFAULT 'disconnected',
  auto_sync_interval_seconds integer NOT NULL DEFAULT 30,
  websocket_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.engine_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage engine_config" ON public.engine_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin action logs
CREATE TABLE public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  section text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage action_logs" ON public.admin_action_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_rules_updated_at BEFORE UPDATE ON public.system_financial_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_referral_config_updated_at BEFORE UPDATE ON public.referral_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bot_default_config_updated_at BEFORE UPDATE ON public.bot_default_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_security_config_updated_at BEFORE UPDATE ON public.security_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engine_config_updated_at BEFORE UPDATE ON public.engine_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one row each
INSERT INTO public.system_config DEFAULT VALUES;
INSERT INTO public.system_financial_rules DEFAULT VALUES;
INSERT INTO public.referral_config DEFAULT VALUES;
INSERT INTO public.bot_default_config DEFAULT VALUES;
INSERT INTO public.security_config DEFAULT VALUES;
INSERT INTO public.engine_config DEFAULT VALUES;
