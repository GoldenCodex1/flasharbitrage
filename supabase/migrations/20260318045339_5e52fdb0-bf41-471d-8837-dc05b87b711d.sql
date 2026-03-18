ALTER TABLE public.bot_activity
ADD CONSTRAINT bot_activity_user_id_key UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.join_trade(
  _user_id uuid,
  _trade_id uuid,
  _amount numeric DEFAULT NULL,
  _source text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trade public.trades%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _plan public.plans%ROWTYPE;
  _amount_to_use numeric;
  _balance numeric := 0;
  _trades_today integer := 0;
  _active_slots integer := 0;
BEGIN
  SELECT * INTO _trade
  FROM public.trades
  WHERE id = _trade_id
  FOR UPDATE;

  IF _trade.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  IF _trade.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade is no longer active');
  END IF;

  IF COALESCE(_trade.slots_filled, 0) >= COALESCE(_trade.slot_limit, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No slots remaining for this trade');
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF COALESCE(_profile.is_frozen, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is frozen');
  END IF;

  SELECT * INTO _plan
  FROM public.plans
  WHERE id = _profile.plan_id
    AND is_active = true;

  IF _plan.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active plan found for user');
  END IF;

  _amount_to_use := COALESCE(_amount, _trade.min_investment);

  IF _amount_to_use IS NULL OR _amount_to_use <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid trade amount');
  END IF;

  IF _amount_to_use < COALESCE(_trade.min_investment, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount is below the minimum trade amount');
  END IF;

  IF _trade.max_investment IS NOT NULL AND _amount_to_use > _trade.max_investment THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds the maximum trade amount');
  END IF;

  IF _amount_to_use > COALESCE(_plan.max_trade_amount, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade amount exceeds current plan limit');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO _balance
  FROM public.transactions
  WHERE user_id = _user_id;

  IF _balance < _amount_to_use THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance to join this trade');
  END IF;

  SELECT COUNT(*)
  INTO _trades_today
  FROM public.trade_entries
  WHERE user_id = _user_id
    AND started_at >= date_trunc('day', now());

  IF _trades_today >= COALESCE(_plan.max_trades_per_day, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for current plan');
  END IF;

  SELECT COUNT(*)
  INTO _active_slots
  FROM public.trade_entries
  WHERE user_id = _user_id
    AND status = 'active';

  IF _active_slots >= COALESCE(_plan.max_auto_trade_slots, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active trade slot limit reached for current plan');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.trade_entries
    WHERE user_id = _user_id
      AND trade_id = _trade_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already joined this trade');
  END IF;

  INSERT INTO public.trade_entries (trade_id, user_id, amount)
  VALUES (_trade_id, _user_id, _amount_to_use);

  INSERT INTO public.transactions (user_id, type, amount, description, reference_id)
  VALUES (
    _user_id,
    'trade_investment',
    -_amount_to_use,
    CASE WHEN _source = 'auto_bot'
      THEN 'Auto bot: Joined ' || COALESCE(_trade.trading_pair, _trade.title)
      ELSE 'Joined ' || COALESCE(_trade.trading_pair, _trade.title)
    END,
    _trade_id
  );

  UPDATE public.trades
  SET slots_filled = COALESCE(slots_filled, 0) + 1
  WHERE id = _trade_id;

  INSERT INTO public.bot_activity (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.bot_activity
  SET trades_today = COALESCE(trades_today, 0) + 1
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', _trade_id,
    'amount', _amount_to_use,
    'source', _source
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trade(uuid, uuid, numeric, text) TO authenticated;