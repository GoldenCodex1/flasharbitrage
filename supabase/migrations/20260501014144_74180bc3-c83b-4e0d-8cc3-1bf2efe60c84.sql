-- PART 9 + 10: Remove digest() dependency, use built-in md5 (no pgcrypto needed)
-- PART 5 + 7: Pure SQL hash generation for wallet addresses & transaction refs

CREATE OR REPLACE FUNCTION public.gen_wallet_address(_seed text)
 RETURNS text
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  -- Use md5 (built-in) chained to produce 40 hex chars (Ethereum-style address)
  SELECT '0x' || substr(
    md5(_seed || gen_random_uuid()::text || clock_timestamp()::text) ||
    md5(gen_random_uuid()::text || clock_timestamp()::text || _seed),
    1, 40
  );
$function$;

-- PART 7 + 8: Transaction ref with retry on uniqueness collision
CREATE OR REPLACE FUNCTION public.gen_transaction_ref(_user_id uuid, _trade_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _ref text;
  _salt text;
  _attempts integer := 0;
BEGIN
  LOOP
    _salt := gen_random_uuid()::text || clock_timestamp()::text;
    -- Chain 2 md5 (32 hex each) -> 64 hex chars total
    _ref := '0x' || (
      md5(_user_id::text || _trade_id::text || _salt) ||
      md5(_salt || _trade_id::text || _user_id::text)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trade_entries WHERE transaction_ref = _ref);
    _attempts := _attempts + 1;
    IF _attempts > 10 THEN EXIT; END IF;
  END LOOP;
  RETURN _ref;
END;
$function$;

-- Ensure uniqueness constraint exists for transaction_ref (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='trade_entries_transaction_ref_key'
  ) THEN
    CREATE UNIQUE INDEX trade_entries_transaction_ref_key
      ON public.trade_entries (transaction_ref)
      WHERE transaction_ref IS NOT NULL;
  END IF;
END $$;

-- PART 1, 3, 11: Hardened settle_trade with strict idempotency (double-settlement prevention)
CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  -- PART 1 + 3 + 11: Lock & verify trade not already settled (idempotency guard)
  SELECT * INTO _trade FROM trades WHERE id = _trade_id FOR UPDATE;

  IF _trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Hard idempotency: stop if already completed/settled OR flag set
  IF _trade.status IN ('settled', 'completed') THEN
    RAISE NOTICE 'settle_trade: trade % already settled (status=%) — skipping', _trade_id, _trade.status;
    RETURN jsonb_build_object('success', false, 'error', 'Trade already settled', 'idempotent', true);
  END IF;

  IF _trade.settlement_processed = true THEN
    RAISE NOTICE 'settle_trade: trade % settlement_processed=true — skipping', _trade_id;
    RETURN jsonb_build_object('success', false, 'error', 'Already settled', 'idempotent', true);
  END IF;

  IF _trade.status != 'running' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not in running status: ' || _trade.status);
  END IF;

  -- Mark as processing immediately to block concurrent runs
  UPDATE trades
  SET settlement_attempts = COALESCE(settlement_attempts, 0) + 1,
      settlement_processed = true
  WHERE id = _trade_id;

  RAISE NOTICE 'settle_trade: starting settlement for trade %', _trade_id;

  _roi_decimal := _trade.roi_percent / 100.0;

  -- PART 2: All inserts/updates below run in same atomic txn; any error -> caller rollback
  FOR _participant IN
    SELECT * FROM trade_entries
    WHERE trade_id = _trade_id AND status = 'active'
    FOR UPDATE
  LOOP
    _profit := _participant.amount * _roi_decimal;
    _total_payout := _participant.amount + _profit;

    -- Guard against duplicate per-entry settlement
    IF _participant.status = 'completed' THEN
      CONTINUE;
    END IF;

    INSERT INTO transactions (user_id, type, amount, description, reference_id)
    VALUES (_participant.user_id, 'trade_return', _participant.amount,
            'Settlement principal: ' || _trade.title, _trade_id);

    INSERT INTO transactions (user_id, type, amount, description, reference_id)
    VALUES (_participant.user_id, 'profit', _profit,
            'Settlement profit (' || _trade.roi_percent || '%): ' || _trade.title, _trade_id);

    UPDATE trade_entries
    SET status = 'completed', profit = _profit, completed_at = now()
    WHERE id = _participant.id AND status = 'active';

    UPDATE bot_activity
    SET profit_today = profit_today + _profit,
        trades_today = trades_today + 1
    WHERE user_id = _participant.user_id;

    _total_principal := _total_principal + _participant.amount;
    _total_profit := _total_profit + _profit;
    _total_paid := _total_paid + _total_payout;
    _investor_count := _investor_count + 1;
  END LOOP;

  UPDATE trades
  SET status = 'settled', settled_at = now()
  WHERE id = _trade_id;

  INSERT INTO trade_settlement_summary (trade_id, total_investors, total_principal, total_profit, total_paid)
  VALUES (_trade_id, _investor_count, _total_principal, _total_profit, _total_paid)
  ON CONFLICT (trade_id) DO NOTHING;

  RAISE NOTICE 'settle_trade: completed trade % — investors=%, paid=%', _trade_id, _investor_count, _total_paid;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', _trade_id,
    'investors', _investor_count,
    'total_principal', _total_principal,
    'total_profit', _total_profit,
    'total_paid', _total_paid
  );
END;
$function$;

-- Backfill: any trade_entries missing transaction_ref or addresses get generated values
DO $$
DECLARE
  _e RECORD;
BEGIN
  FOR _e IN SELECT id, user_id, trade_id FROM trade_entries
            WHERE transaction_ref IS NULL OR from_address IS NULL OR mid_address IS NULL
               OR intermediate_address IS NULL OR final_address IS NULL
  LOOP
    UPDATE trade_entries SET
      transaction_ref = COALESCE(transaction_ref, public.gen_transaction_ref(_e.user_id, _e.trade_id)),
      from_address = COALESCE(from_address, public.gen_wallet_address(_e.user_id::text || '-from-' || _e.trade_id::text)),
      mid_address = COALESCE(mid_address, public.gen_wallet_address(_e.trade_id::text || '-mid')),
      intermediate_address = COALESCE(intermediate_address, public.gen_wallet_address(_e.trade_id::text || '-int')),
      final_address = COALESCE(final_address, public.gen_wallet_address(_e.user_id::text || '-final-' || _e.trade_id::text))
    WHERE id = _e.id;
  END LOOP;
END $$;

-- Ensure unique constraint on trade_settlement_summary.trade_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='trade_settlement_summary_trade_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.trade_settlement_summary
        ADD CONSTRAINT trade_settlement_summary_trade_id_key UNIQUE (trade_id);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;