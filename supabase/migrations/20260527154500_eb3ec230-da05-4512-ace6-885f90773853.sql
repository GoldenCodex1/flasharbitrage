
-- 1) Asset -> network resolver
CREATE OR REPLACE FUNCTION public.resolve_network_for_pair(_pair text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _base text;
BEGIN
  IF _pair IS NULL OR length(_pair) = 0 THEN
    RETURN 'ERC20';
  END IF;
  _base := upper(split_part(_pair, '/', 1));
  _base := regexp_replace(_base, '[^A-Z0-9]', '', 'g');

  -- TRC20 (Tron ecosystem)
  IF _base IN ('TRX','SUN','JST','WIN','BTT','USDTTRC20','USDDTRC20') THEN
    RETURN 'TRC20';
  END IF;

  -- BTC
  IF _base IN ('BTC','WBTC','BITCOIN') THEN
    RETURN 'BTC';
  END IF;

  -- Solana
  IF _base IN ('SOL','RAY','SRM','BONK','JTO','PYTH','WIF','JUP') THEN
    RETURN 'SOL';
  END IF;

  -- BEP20 (BNB ecosystem)
  IF _base IN ('BNB','CAKE','XVS','SXP','BAKE','BURGER','ALPACA') THEN
    RETURN 'BEP20';
  END IF;

  -- ERC20 (default Ethereum ecosystem)
  IF _base IN ('ETH','LINK','UNI','SHIB','PEPE','AAVE','MKR','SNX','CRV','LDO','ARB','OP','MATIC','USDT','USDC','DAI') THEN
    RETURN 'ERC20';
  END IF;

  -- Fallback
  RETURN 'ERC20';
END;
$$;

-- 2) Patch join_trade so network falls back to resolver (not random)
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
  _net := COALESCE(_trade.network, public.resolve_network_for_pair(_trade.trading_pair));

  -- Persist network if it was missing or wrong for the pair
  IF _trade.network IS NULL OR _trade.network <> _net THEN
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

-- 3) Backfill: correct network for non-settled trades whose stored network
--    doesn't match what the pair resolves to.
UPDATE public.trades t
SET network = public.resolve_network_for_pair(t.trading_pair)
WHERE t.status IN ('active','running','closed')
  AND (t.network IS NULL OR t.network <> public.resolve_network_for_pair(t.trading_pair));

-- 4) Regenerate addresses ONLY for still-active trade_entries whose stored
--    address format no longer matches the trade's (now-corrected) network.
--    Completed/settled entries are preserved untouched.
UPDATE public.trade_entries te
SET 
  from_address         = public.gen_wallet_address_for_network(te.user_id::text || '-from-' || te.trade_id::text, t.network),
  mid_address          = public.gen_wallet_address_for_network(te.trade_id::text || '-mid-' || te.id::text, t.network),
  intermediate_address = public.gen_wallet_address_for_network(te.trade_id::text || '-int-' || te.id::text, t.network),
  final_address        = public.gen_wallet_address_for_network(te.user_id::text || '-final-' || te.trade_id::text, t.network)
FROM public.trades t
WHERE te.trade_id = t.id
  AND te.status = 'active'
  AND t.network IS NOT NULL
  AND (
    (t.network IN ('ERC20','BEP20') AND COALESCE(te.from_address,'') NOT LIKE '0x%')
    OR (t.network = 'TRC20'         AND COALESCE(te.from_address,'') NOT LIKE 'T%')
    OR (t.network = 'BTC'           AND COALESCE(te.from_address,'') NOT LIKE 'bc1%')
    OR (t.network = 'SOL'           AND (COALESCE(te.from_address,'') LIKE '0x%' OR COALESCE(te.from_address,'') LIKE 'T%' OR COALESCE(te.from_address,'') LIKE 'bc1%'))
  );
