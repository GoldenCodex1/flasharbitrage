
-- SECTION 1: Risk profile configuration table
CREATE TABLE IF NOT EXISTS public.risk_profile_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name text NOT NULL UNIQUE,
  roi_min numeric NOT NULL DEFAULT 1,
  roi_max numeric NOT NULL DEFAULT 5,
  volatility_level text NOT NULL DEFAULT 'low',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_profile_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage risk_profile_config" ON public.risk_profile_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view risk_profile_config" ON public.risk_profile_config FOR SELECT TO authenticated USING (true);

INSERT INTO public.risk_profile_config (profile_name, roi_min, roi_max, volatility_level) VALUES
  ('Conservative', 1.5, 5.0, 'low'),
  ('Balanced', 4.0, 10.0, 'moderate'),
  ('Aggressive', 8.0, 18.0, 'high');

-- SECTION 7: Add exchange display fields to trades
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trading_pair text NOT NULL DEFAULT 'BTC/USDT';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS buy_exchange text NOT NULL DEFAULT 'Binance';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS sell_exchange text NOT NULL DEFAULT 'Coinbase';

-- SECTION 2: Referral commission trigger on deposit approval + deposit credit
CREATE OR REPLACE FUNCTION public.on_deposit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer_id uuid;
  _commission_percent numeric;
  _commission_amount numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    -- Credit deposit to user ledger
    IF NOT EXISTS (SELECT 1 FROM transactions WHERE reference_id = NEW.id AND type = 'deposit') THEN
      INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (NEW.user_id, 'deposit', NEW.amount, 'Deposit approved: ' || NEW.currency, NEW.id);
    END IF;

    -- Referral commission (only on confirmed deposit)
    SELECT referred_by INTO _referrer_id FROM profiles WHERE user_id = NEW.user_id;
    IF _referrer_id IS NOT NULL THEN
      SELECT default_commission_percent INTO _commission_percent FROM referral_config LIMIT 1;
      _commission_percent := COALESCE(_commission_percent, 1.0);
      _commission_amount := NEW.amount * (_commission_percent / 100.0);

      IF NOT EXISTS (SELECT 1 FROM referral_commissions WHERE deposit_id = NEW.id) THEN
        INSERT INTO referral_commissions (referrer_id, referred_user_id, deposit_id, commission_amount)
        VALUES (_referrer_id, NEW.user_id, NEW.id, _commission_amount);

        INSERT INTO transactions (user_id, type, amount, description, reference_id)
        VALUES (_referrer_id, 'referral', _commission_amount, 'Referral commission from deposit', NEW.id);

        UPDATE referrals SET total_commission = total_commission + _commission_amount
        WHERE referrer_id = _referrer_id AND referred_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deposit_status_change
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.on_deposit_status_change();

-- SECTION 4: Updated auto_transition_trades for proper lifecycle
CREATE OR REPLACE FUNCTION public.auto_transition_trades()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _trade RECORD;
  _allocated numeric;
  _results jsonb := '[]'::jsonb;
BEGIN
  -- Auto-close active trades at capital cap
  FOR _trade IN
    SELECT t.* FROM trades t
    WHERE t.status = 'active' AND t.auto_close = true AND t.capital_cap IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO _allocated FROM trade_entries WHERE trade_id = _trade.id AND status = 'active';
    IF _allocated >= _trade.capital_cap THEN
      UPDATE trades SET status = 'running', settlement_date = now() + make_interval(hours => _trade.duration_hours::int) WHERE id = _trade.id;
      _results := _results || jsonb_build_object('trade_id', _trade.id, 'transition', 'active->running', 'reason', 'capital_cap_reached');
    END IF;
  END LOOP;

  -- Active trades whose expires_at has passed -> running (ready for settlement)
  FOR _trade IN
    SELECT * FROM trades
    WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now()
  LOOP
    UPDATE trades SET status = 'running', settlement_date = now() WHERE id = _trade.id;
    _results := _results || jsonb_build_object('trade_id', _trade.id, 'transition', 'active->running', 'reason', 'time_expired');
  END LOOP;

  -- Closed trades -> running when settlement_date reached
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

-- SECTION 4: Updated settle_trade to also update bot_activity
CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _trade RECORD;
  _participant RECORD;
  _roi_decimal numeric;
  _profit numeric;
  _total_payout numeric;
  _total_principal numeric := 0;
  _total_profit numeric := 0;
  _total_paid numeric := 0;
  _investor_count integer := 0;
  _available_liquidity numeric;
  _total_liability numeric;
BEGIN
  SELECT * INTO _trade FROM trades WHERE id = _trade_id FOR UPDATE;
  IF _trade IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Trade not found'); END IF;
  IF _trade.status != 'running' THEN RETURN jsonb_build_object('success', false, 'error', 'Trade not in running status'); END IF;
  IF _trade.settlement_processed = true THEN RETURN jsonb_build_object('success', false, 'error', 'Already settled'); END IF;

  UPDATE trades SET settlement_attempts = settlement_attempts + 1 WHERE id = _trade_id;
  _roi_decimal := _trade.roi_percent / 100.0;

  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO _total_liability, _investor_count
    FROM trade_entries WHERE trade_id = _trade_id AND status = 'active';

  _total_liability := _total_liability * (1 + _roi_decimal);

  IF _investor_count = 0 THEN
    UPDATE trades SET status = 'settled', settlement_processed = true, settled_at = now() WHERE id = _trade_id;
    INSERT INTO trade_settlement_summary (trade_id, total_investors, total_principal, total_profit, total_paid) VALUES (_trade_id, 0, 0, 0, 0);
    RETURN jsonb_build_object('success', true, 'investors', 0, 'total_paid', 0);
  END IF;

  FOR _participant IN SELECT * FROM trade_entries WHERE trade_id = _trade_id AND status = 'active'
  LOOP
    _profit := _participant.amount * _roi_decimal;
    _total_payout := _participant.amount + _profit;

    INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (_participant.user_id, 'trade_return', _participant.amount, 'Settlement principal: ' || _trade.title, _trade_id);
    INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (_participant.user_id, 'profit', _profit, 'Settlement profit (' || _trade.roi_percent || '%): ' || _trade.title, _trade_id);

    UPDATE trade_entries SET status = 'completed', profit = _profit, completed_at = now() WHERE id = _participant.id;

    -- Update bot_activity for dynamic dashboard
    UPDATE bot_activity SET
      profit_today = profit_today + _profit,
      trades_today = trades_today + 1
    WHERE user_id = _participant.user_id;

    _total_principal := _total_principal + _participant.amount;
    _total_profit := _total_profit + _profit;
    _total_paid := _total_paid + _total_payout;
  END LOOP;

  UPDATE trades SET status = 'settled', settlement_processed = true, settled_at = now() WHERE id = _trade_id;

  INSERT INTO trade_settlement_summary (trade_id, total_investors, total_principal, total_profit, total_paid)
    VALUES (_trade_id, _investor_count, _total_principal, _total_profit, _total_paid);

  RETURN jsonb_build_object('success', true, 'trade_id', _trade_id, 'investors', _investor_count, 'total_principal', _total_principal, 'total_profit', _total_profit, 'total_paid', _total_paid);
END;
$$;
