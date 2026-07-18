
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_withdrawal_id uuid, _admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _w RECORD;
  _balance numeric;
BEGIN
  -- Lock the withdrawal row
  SELECT * INTO _w FROM withdrawals WHERE id = _withdrawal_id FOR UPDATE;

  IF _w IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF _w.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is not in pending status. Current: ' || _w.status);
  END IF;

  -- Calculate user balance from ledger
  SELECT COALESCE(SUM(amount), 0) INTO _balance
  FROM transactions
  WHERE user_id = _w.user_id;

  IF _balance < _w.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Available: ' || _balance::text || ', Requested: ' || _w.amount::text);
  END IF;

  -- Insert withdrawal ledger entry (negative amount)
  INSERT INTO transactions (user_id, type, amount, description, reference_id)
  VALUES (_w.user_id, 'withdrawal', -(_w.amount), 'Withdrawal approved: ' || _w.currency || ' to ' || LEFT(_w.wallet_address, 12) || '...', _withdrawal_id);

  -- Update withdrawal status
  UPDATE withdrawals SET
    status = 'approved',
    processed_at = now(),
    processed_by_admin = _admin_id
  WHERE id = _withdrawal_id;

  -- Audit log
  INSERT INTO admin_action_logs (admin_id, section, field_name, old_value, new_value)
  VALUES (_admin_id, 'withdrawals', 'status_approved', 'pending', 'approved');

  RETURN jsonb_build_object('success', true, 'withdrawal_id', _withdrawal_id, 'amount_deducted', _w.amount);
END;
$$;
