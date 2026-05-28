-- Update wallet address generator: add POLYGON & ARBITRUM (0x style)
CREATE OR REPLACE FUNCTION public.gen_wallet_address_for_network(_seed text, _network text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _hex text;
  _b58_chars text := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  _b32_chars text := 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  _net text := upper(coalesce(_network, 'ERC20'));
  _out text := '';
  _i int;
  _len int;
  _src text;
BEGIN
  _hex := md5(_seed || gen_random_uuid()::text || clock_timestamp()::text)
       || md5(gen_random_uuid()::text || _seed || clock_timestamp()::text)
       || md5(clock_timestamp()::text || _seed || gen_random_uuid()::text);

  IF _net IN ('ERC20','BEP20','ETH','BSC','POLYGON','MATIC','ARBITRUM','ARB') THEN
    RETURN '0x' || substr(_hex, 1, 40);

  ELSIF _net IN ('TRC20','TRON','TRX') THEN
    _src := _b58_chars;
    _len := 33;
    _out := 'T';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('BTC','BITCOIN') THEN
    _src := _b32_chars;
    _len := 38;
    _out := 'bc1q';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('SOL','SOLANA') THEN
    _src := _b58_chars;
    _len := 44;
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSE
    RETURN '0x' || substr(_hex, 1, 40);
  END IF;
END;
$function$;

-- Update join_trade: prefer admin-stored network; only fall back & persist if NULL
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
  _net text;
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

  -- PRIORITY: admin-selected network on trade. Only fall back to resolver if NULL.
  IF _trade.network IS NOT NULL AND length(_trade.network) > 0 THEN
    _net := _trade.network;
  ELSE
    _net := public.resolve_network_for_pair(_trade.trading_pair);
    UPDATE public.trades SET network = _net WHERE id = _trade_id;
  END IF;

  _from_addr := public.gen_wallet_address_for_network(_user_id::text || '-from-' || _trade_id::text, _net);
  _mid_addr := public.gen_wallet_address_for_network(_trade_id::text || '-mid', _net);
  _int_addr := public.gen_wallet_address_for_network(_trade_id::text || '-int', _net);
  _final_addr := public.gen_wallet_address_for_network(_user_id::text || '-final-' || _trade_id::text, _net);

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
    'source', _source,
    'network', _net
  );
END;
$function$;