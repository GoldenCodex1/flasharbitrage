
-- API Gateways Registry
CREATE TABLE IF NOT EXISTS public.api_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'disconnected',
  webhook_status text NOT NULL DEFAULT 'not_verified',
  consecutive_failures integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT false,
  last_health_check timestamptz,
  max_failures_before_disable integer NOT NULL DEFAULT 3,
  max_calls_per_minute integer NOT NULL DEFAULT 60,
  auto_disable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_gateways"
  ON public.api_gateways FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- API Credentials (per gateway)
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.api_gateways(id) ON DELETE CASCADE,
  encrypted_api_key text NOT NULL DEFAULT '',
  encrypted_ipn_secret text NOT NULL DEFAULT '',
  webhook_secret text NOT NULL DEFAULT '',
  webhook_url text NOT NULL DEFAULT '',
  auto_confirm boolean NOT NULL DEFAULT false,
  allowed_currencies text[] NOT NULL DEFAULT ARRAY['USDT','BTC','ETH'],
  allowed_networks text[] NOT NULL DEFAULT ARRAY['TRC20','ERC20','BEP20'],
  fee_handling text NOT NULL DEFAULT 'user',
  mode text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_credentials"
  ON public.api_credentials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Webhook Logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payload_hash text,
  status text NOT NULL DEFAULT 'received',
  response_code integer,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook_logs"
  ON public.webhook_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- API Health Logs
CREATE TABLE IF NOT EXISTS public.api_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_health_logs"
  ON public.api_health_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON public.webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON public.webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_provider ON public.api_health_logs(provider);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_created_at ON public.api_health_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_gateways_active ON public.api_gateways(active);
