
-- Alter existing wallets table to add institutional columns
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wallet_type text NOT NULL DEFAULT 'hot',
  ADD COLUMN IF NOT EXISTS usage_type text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create deposit_settings table (per-currency)
CREATE TABLE IF NOT EXISTS deposit_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL UNIQUE,
  min_amount numeric NOT NULL DEFAULT 10,
  max_amount numeric NOT NULL DEFAULT 100000,
  confirmations_required integer NOT NULL DEFAULT 3,
  auto_approve boolean NOT NULL DEFAULT false,
  manual_review_threshold numeric NOT NULL DEFAULT 5000,
  address_rotation_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create withdrawal_settings table (per-currency)
CREATE TABLE IF NOT EXISTS withdrawal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL UNIQUE,
  min_amount numeric NOT NULL DEFAULT 20,
  max_amount numeric NOT NULL DEFAULT 50000,
  daily_limit numeric NOT NULL DEFAULT 10000,
  auto_approve_threshold numeric NOT NULL DEFAULT 1000,
  high_risk_threshold numeric NOT NULL DEFAULT 10000,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  require_2fa boolean NOT NULL DEFAULT true,
  require_ip_match boolean NOT NULL DEFAULT false,
  fee_type text NOT NULL DEFAULT 'percentage',
  fee_value numeric NOT NULL DEFAULT 1.0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create liquidity_rules table (singleton)
CREATE TABLE IF NOT EXISTS liquidity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_buffer_percent numeric NOT NULL DEFAULT 20,
  emergency_threshold_percent numeric NOT NULL DEFAULT 10,
  auto_disable_withdrawals boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE deposit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage deposit_settings" ON deposit_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage withdrawal_settings" ON withdrawal_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage liquidity_rules" ON liquidity_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_archived ON wallets(archived_at);
