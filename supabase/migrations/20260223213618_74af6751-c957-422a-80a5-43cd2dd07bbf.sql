
-- Add settlement columns to trades
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS settlement_processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS settlement_attempts integer NOT NULL DEFAULT 0;

-- Create trade_settlement_summary table
CREATE TABLE IF NOT EXISTS public.trade_settlement_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id),
  total_investors integer NOT NULL DEFAULT 0,
  total_principal numeric NOT NULL DEFAULT 0,
  total_profit numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_settlement_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trade_settlement_summary"
  ON public.trade_settlement_summary FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  reference_id uuid,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_alerts"
  ON public.system_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create the atomic settlement function
CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trade RECORD;
  _participant RECORD;
  _roi_decimal numeric;
  _profit numeric;
  _total_payout numeric;
  _balance_before numeric;
  _balance_after numeric;
  _total_principal numeric := 0;
  _total_profit numeric := 0;
  _total_paid numeric := 0;
  _investor_count integer := 0;
  _available_liquidity numeric;
  _total_liability numeric;
BEGIN
  -- Step 1: Lock trade row and validate
  SELECT * INTO _trade FROM trades WHERE id = _trade_id FOR UPDATE;
  
  IF _trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;
  
  IF _trade.status != 'running' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not in running status');
  END IF;
  
  IF _trade.settlement_processed = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already settled');
  END IF;
  
  -- Increment attempt counter
  UPDATE trades SET settlement_attempts = settlement_attempts + 1 WHERE id = _trade_id;
  
  _roi_decimal := _trade.roi_percent / 100.0;
  
  -- Step 2: Calculate total liability
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO _total_liability, _investor_count
    FROM trade_entries
    WHERE trade_id = _trade_id AND status = 'active';
  
  _total_liability := _total_liability * (1 + _roi_decimal);
  
  IF _investor_count = 0 THEN
    -- No participants, just mark settled
    UPDATE trades SET status = 'settled', settlement_processed = true, settled_at = now() WHERE id = _trade_id;
    INSERT INTO trade_settlement_summary (trade_id, total_investors, total_principal, total_profit, total_paid)
      VALUES (_trade_id, 0, 0, 0, 0);
    RETURN jsonb_build_object('success', true, 'investors', 0, 'total_paid', 0);
  END IF;
  
  -- Step 3: Liquidity validation
  -- Available liquidity = sum of all user balances from transactions ledger (platform holds these funds)
  -- For safety, we check that we can cover the payouts
  -- The platform's available funds are the net of all deposits minus withdrawals
  SELECT COALESCE(SUM(CASE WHEN type IN ('deposit', 'trade_return', 'profit', 'refund', 'adjustment', 'referral') THEN amount ELSE -amount END), 0)
    INTO _available_liquidity
    FROM transactions;
  
  IF _available_liquidity < _total_liability THEN
    -- Liquidity insufficient - abort
    UPDATE trades SET status = 'running' WHERE id = _trade_id; -- keep as running
    INSERT INTO system_alerts (type, reference_id, message, severity)
      VALUES ('Settlement Failure', _trade_id, 
              'Insufficient liquidity. Required: $' || _total_liability::text || ', Available: $' || _available_liquidity::text,
              'high');
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient liquidity', 'required', _total_liability, 'available', _available_liquidity);
  END IF;
  
  -- Step 4: Process each participant atomically
  FOR _participant IN
    SELECT * FROM trade_entries WHERE trade_id = _trade_id AND status = 'active'
  LOOP
    _profit := _participant.amount * _roi_decimal;
    _total_payout := _participant.amount + _profit;
    
    -- Calculate balance before (from ledger)
    SELECT COALESCE(SUM(CASE 
      WHEN type IN ('deposit', 'trade_return', 'profit', 'refund', 'adjustment', 'referral') THEN amount 
      ELSE -amount END), 0)
      INTO _balance_before
      FROM transactions WHERE user_id = _participant.user_id;
    
    _balance_after := _balance_before + _total_payout;
    
    -- Create principal return ledger entry
    INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (_participant.user_id, 'trade_return', _participant.amount, 
              'Settlement principal: ' || _trade.title, _trade_id);
    
    -- Create profit ledger entry
    INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (_participant.user_id, 'profit', _profit,
              'Settlement profit (' || _trade.roi_percent || '%): ' || _trade.title, _trade_id);
    
    -- Update participant record
    UPDATE trade_entries SET 
      status = 'completed',
      profit = _profit,
      completed_at = now()
    WHERE id = _participant.id;
    
    _total_principal := _total_principal + _participant.amount;
    _total_profit := _total_profit + _profit;
    _total_paid := _total_paid + _total_payout;
  END LOOP;
  
  -- Step 5: Mark trade as settled
  UPDATE trades SET 
    status = 'settled',
    settlement_processed = true,
    settled_at = now()
  WHERE id = _trade_id;
  
  -- Create settlement summary
  INSERT INTO trade_settlement_summary (trade_id, total_investors, total_principal, total_profit, total_paid)
    VALUES (_trade_id, _investor_count, _total_principal, _total_profit, _total_paid);
  
  -- Log admin action
  INSERT INTO admin_action_logs (section, field_name, old_value, new_value, admin_id)
    VALUES ('trade_settlement', 'status', 'running', 'settled', NULL);
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', _trade_id,
    'investors', _investor_count,
    'total_principal', _total_principal,
    'total_profit', _total_profit,
    'total_paid', _total_paid
  );
END;
$$;

-- Auto-transition function: open->closed (cap reached), closed->running (settlement_date)
CREATE OR REPLACE FUNCTION public.auto_transition_trades()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trade RECORD;
  _allocated numeric;
  _results jsonb := '[]'::jsonb;
BEGIN
  -- Auto-close trades at capital cap
  FOR _trade IN
    SELECT t.* FROM trades t
    WHERE t.status = 'active' AND t.auto_close = true AND t.capital_cap IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO _allocated FROM trade_entries WHERE trade_id = _trade.id AND status = 'active';
    IF _allocated >= _trade.capital_cap THEN
      UPDATE trades SET status = 'closed' WHERE id = _trade.id;
      _results := _results || jsonb_build_object('trade_id', _trade.id, 'transition', 'active->closed', 'reason', 'capital_cap_reached');
    END IF;
  END LOOP;
  
  -- Auto-transition closed trades to running when settlement_date is set and current
  FOR _trade IN
    SELECT * FROM trades
    WHERE status = 'closed' AND settlement_date IS NOT NULL AND settlement_date <= now()
  LOOP
    UPDATE trades SET status = 'running' WHERE id = _trade.id;
    _results := _results || jsonb_build_object('trade_id', _trade.id, 'transition', 'closed->running');
  END LOOP;
  
  RETURN _results;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_settlement ON public.trades(status, settlement_processed, settlement_date);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON public.system_alerts(type, resolved);
CREATE INDEX IF NOT EXISTS idx_trade_settlement_summary_trade ON public.trade_settlement_summary(trade_id);
