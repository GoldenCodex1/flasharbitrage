
-- Bot Global Settings (single-row config)
CREATE TABLE public.bot_global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  global_risk_mode text NOT NULL DEFAULT 'moderate',
  max_platform_exposure numeric NOT NULL DEFAULT 100000,
  max_concurrent_trades integer NOT NULL DEFAULT 50,
  trading_window_start time DEFAULT '00:00',
  trading_window_end time DEFAULT '23:59',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.bot_global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_global_settings"
  ON public.bot_global_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view bot_global_settings"
  ON public.bot_global_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed default row
INSERT INTO public.bot_global_settings (id) VALUES (gen_random_uuid());

-- Bot Strategy Settings (single-row config)
CREATE TABLE public.bot_strategy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_roi_percent numeric NOT NULL DEFAULT 1.5,
  max_roi_percent numeric NOT NULL DEFAULT 15,
  min_trade_duration_min integer NOT NULL DEFAULT 30,
  max_trade_duration_min integer NOT NULL DEFAULT 1440,
  spread_tolerance_percent numeric NOT NULL DEFAULT 0.5,
  slippage_control_percent numeric NOT NULL DEFAULT 0.3,
  max_loss_per_trade numeric NOT NULL DEFAULT 500,
  max_daily_platform_loss numeric NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.bot_strategy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_strategy_settings"
  ON public.bot_strategy_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view bot_strategy_settings"
  ON public.bot_strategy_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.bot_strategy_settings (id) VALUES (gen_random_uuid());

-- Bot Capital Rules (single-row config)
CREATE TABLE public.bot_capital_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_allocation_percent numeric NOT NULL DEFAULT 50,
  capital_locked_per_trade_percent numeric NOT NULL DEFAULT 10,
  liquidity_buffer_percent numeric NOT NULL DEFAULT 20,
  auto_rebalance boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.bot_capital_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_capital_rules"
  ON public.bot_capital_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view bot_capital_rules"
  ON public.bot_capital_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.bot_capital_rules (id) VALUES (gen_random_uuid());

-- Bot Alert Settings (single-row config)
CREATE TABLE public.bot_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawdown_threshold_percent numeric NOT NULL DEFAULT 10,
  consecutive_loss_limit integer NOT NULL DEFAULT 5,
  daily_loss_cap numeric NOT NULL DEFAULT 5000,
  exposure_spike_percent numeric NOT NULL DEFAULT 80,
  api_failure_alert boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.bot_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_alert_settings"
  ON public.bot_alert_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.bot_alert_settings (id) VALUES (gen_random_uuid());

-- Bot Logs (audit trail)
CREATE TABLE public.bot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  user_id uuid,
  action_type text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  previous_value text,
  new_value text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot_logs"
  ON public.bot_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update triggers
CREATE TRIGGER update_bot_global_settings_updated_at
  BEFORE UPDATE ON public.bot_global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_strategy_settings_updated_at
  BEFORE UPDATE ON public.bot_strategy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_capital_rules_updated_at
  BEFORE UPDATE ON public.bot_capital_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_alert_settings_updated_at
  BEFORE UPDATE ON public.bot_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
