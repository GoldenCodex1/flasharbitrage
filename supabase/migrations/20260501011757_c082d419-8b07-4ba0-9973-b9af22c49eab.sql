-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add columns
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS transaction_ref text,
  ADD COLUMN IF NOT EXISTS from_address text,
  ADD COLUMN IF NOT EXISTS mid_address text,
  ADD COLUMN IF NOT EXISTS intermediate_address text,
  ADD COLUMN IF NOT EXISTS final_address text;

-- Helper: generate a 0x + 40-char hex address from a seed
CREATE OR REPLACE FUNCTION public.gen_wallet_address(_seed text)
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT '0x' || substr(encode(extensions.digest(_seed || gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'), 1, 40);
$$;

-- Helper: generate a 0x + 64-char hex transaction ref (unique)
CREATE OR REPLACE FUNCTION public.gen_transaction_ref(_user_id uuid, _trade_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  _ref text;
  _attempts integer := 0;
BEGIN
  LOOP
    _ref := '0x' || substr(
      encode(
        extensions.digest(
          _user_id::text || _trade_id::text || clock_timestamp()::text || gen_random_uuid()::text,
          'sha256'
        ),
        'hex'
      ),
      1, 64
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trade_entries WHERE transaction_ref = _ref);
    _attempts := _attempts + 1;
    IF _attempts > 5 THEN EXIT; END IF;
  END LOOP;
  RETURN _ref;
END;
$$;

-- Backfill
UPDATE public.trade_entries
SET
  transaction_ref = COALESCE(transaction_ref, public.gen_transaction_ref(user_id, trade_id)),
  from_address = COALESCE(from_address, public.gen_wallet_address(user_id::text || '-from')),
  mid_address = COALESCE(mid_address, public.gen_wallet_address(trade_id::text || '-mid')),
  intermediate_address = COALESCE(intermediate_address, public.gen_wallet_address(trade_id::text || '-int')),
  final_address = COALESCE(final_address, public.gen_wallet_address(user_id::text || '-final'))
WHERE transaction_ref IS NULL
   OR from_address IS NULL
   OR mid_address IS NULL
   OR intermediate_address IS NULL
   OR final_address IS NULL;

-- Unique constraint
ALTER TABLE public.trade_entries
  DROP CONSTRAINT IF EXISTS trade_entries_transaction_ref_unique;
ALTER TABLE public.trade_entries
  ADD CONSTRAINT trade_entries_transaction_ref_unique UNIQUE (transaction_ref);

-- Update join_trade
CREATE OR REPLACE FUNCTION public.join_trade(_user_id uuid, _trade_id uuid, _amount numeric DEFAULT NULL::numeric, _source text DEFAULT 'manual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _trade public.trades%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _plan public.plans%ROWTYPE;
  _amount_to_use numeric;
  _balance numeric := 0;
  _trades_today integer := 0;
  _active_slots integer := 0;
  _tx_ref text;
  _from_addr text;
  _mid_addr text;
  _int_addr text;
  _final_addr text;
  _entry_id uuid;
BEGIN
  SELECT * INTO _trade FROM public.trades WHERE id = _trade_id FOR UPDATE;
  IF _trade.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Trade not found'); END IF;
  IF _trade.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Trade is no longer active'); END IF;
  IF COALESCE(_trade.slots_filled, 0) >= COALESCE(_trade.slot_limit, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No slots remaining for this trade');
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id;
  IF _profile.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User profile not found'); END IF;
  IF COALESCE(_profile.is_frozen, false) THEN RETURN jsonb_build_object('success', false, 'error', 'Account is frozen'); END IF;

  SELECT * INTO _plan FROM public.plans WHERE id = _profile.plan_id AND is_active = true;
  IF _plan.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No active plan found for user'); END IF;

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

  SELECT COALESCE(SUM(amount), 0) INTO _balance FROM public.transactions WHERE user_id = _user_id;
  IF _balance < _amount_to_use THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance to join this trade');
  END IF;

  SELECT COUNT(*) INTO _trades_today FROM public.trade_entries
  WHERE user_id = _user_id AND started_at >= date_trunc('day', now());
  IF _trades_today >= COALESCE(_plan.max_trades_per_day, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for current plan');
  END IF;

  SELECT COUNT(*) INTO _active_slots FROM public.trade_entries
  WHERE user_id = _user_id AND status = 'active';
  IF _active_slots >= COALESCE(_plan.max_auto_trade_slots, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active trade slot limit reached for current plan');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trade_entries
    WHERE user_id = _user_id AND trade_id = _trade_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already joined this trade');
  END IF;

  _tx_ref := public.gen_transaction_ref(_user_id, _trade_id);
  _from_addr := public.gen_wallet_address(_user_id::text || '-from-' || _trade_id::text);
  _mid_addr := public.gen_wallet_address(_trade_id::text || '-mid');
  _int_addr := public.gen_wallet_address(_trade_id::text || '-int');
  _final_addr := public.gen_wallet_address(_user_id::text || '-final-' || _trade_id::text);

  INSERT INTO public.trade_entries (
    trade_id, user_id, amount,
    transaction_ref, from_address, mid_address, intermediate_address, final_address
  )
  VALUES (
    _trade_id, _user_id, _amount_to_use,
    _tx_ref, _from_addr, _mid_addr, _int_addr, _final_addr
  )
  RETURNING id INTO _entry_id;

  INSERT INTO public.transactions (user_id, type, amount, description, reference_id)
  VALUES (
    _user_id, 'trade_investment', -_amount_to_use,
    CASE WHEN _source = 'auto_bot'
      THEN 'Auto bot: Joined ' || COALESCE(_trade.trading_pair, _trade.title)
      ELSE 'Joined ' || COALESCE(_trade.trading_pair, _trade.title)
    END,
    _trade_id
  );

  UPDATE public.trades SET slots_filled = COALESCE(slots_filled, 0) + 1 WHERE id = _trade_id;

  INSERT INTO public.bot_activity (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.bot_activity SET trades_today = COALESCE(trades_today, 0) + 1 WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', _trade_id,
    'entry_id', _entry_id,
    'amount', _amount_to_use,
    'transaction_ref', _tx_ref,
    'source', _source
  );
END;
$function$;