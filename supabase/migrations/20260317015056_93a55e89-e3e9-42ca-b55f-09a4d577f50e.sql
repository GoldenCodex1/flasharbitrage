
-- Trade generator configuration table
CREATE TABLE IF NOT EXISTS public.trade_generator_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  generation_interval_minutes integer NOT NULL DEFAULT 180,
  max_active_trades integer NOT NULL DEFAULT 15,
  trading_pairs text[] NOT NULL DEFAULT ARRAY['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT'],
  exchanges text[] NOT NULL DEFAULT ARRAY['Binance','Coinbase','Kraken','KuCoin','Bybit','OKX'],
  min_duration_hours integer NOT NULL DEFAULT 2,
  max_duration_hours integer NOT NULL DEFAULT 6,
  min_investment_default numeric NOT NULL DEFAULT 25,
  max_investment_default numeric NOT NULL DEFAULT 10000,
  slot_limit_default integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.trade_generator_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trade_generator_config"
  ON public.trade_generator_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth users can view trade_generator_config"
  ON public.trade_generator_config FOR SELECT TO authenticated
  USING (true);

-- Seed default config
INSERT INTO public.trade_generator_config (enabled, generation_interval_minutes, max_active_trades)
VALUES (true, 180, 15);
