
-- Add missing columns to trades table for full lifecycle management
ALTER TABLE public.trades 
  ADD COLUMN IF NOT EXISTS strategy_type text NOT NULL DEFAULT 'arbitrage',
  ADD COLUMN IF NOT EXISTS capital_cap numeric,
  ADD COLUMN IF NOT EXISTS auto_close boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS settlement_date timestamp with time zone;

-- Add index on status for faster tab filtering
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trade_entries_trade_id ON public.trade_entries(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_entries_user_id ON public.trade_entries(user_id);
