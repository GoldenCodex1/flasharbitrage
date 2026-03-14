
-- Add duration and pricing fields to plans table
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS upgrade_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free_plan boolean NOT NULL DEFAULT false;

-- Update existing plans with duration info
UPDATE public.plans SET duration_days = NULL, upgrade_price = 0, is_free_plan = true WHERE name = 'FREE';
UPDATE public.plans SET duration_days = 30, upgrade_price = 99 WHERE name = 'PRO';
UPDATE public.plans SET duration_days = 30, upgrade_price = 299 WHERE name = 'ELITE';

-- Create function for plan upgrade with balance check
CREATE OR REPLACE FUNCTION public.upgrade_plan(_user_id uuid, _plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan RECORD;
  _current_plan_id uuid;
  _balance numeric;
BEGIN
  -- Get target plan
  SELECT * INTO _plan FROM plans WHERE id = _plan_id AND is_active = true;
  IF _plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found or inactive');
  END IF;

  -- Get current plan
  SELECT plan_id INTO _current_plan_id FROM profiles WHERE user_id = _user_id;
  IF _current_plan_id = _plan_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already on this plan');
  END IF;

  -- Check balance if paid plan
  IF _plan.upgrade_price > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO _balance FROM transactions WHERE user_id = _user_id;
    IF _balance < _plan.upgrade_price THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance to activate this plan. Required: $' || _plan.upgrade_price::text || ', Available: $' || _balance::text);
    END IF;

    -- Deduct upgrade price
    INSERT INTO transactions (user_id, type, amount, description, reference_id)
    VALUES (_user_id, 'plan_upgrade', -(_plan.upgrade_price), 'Plan upgrade to ' || _plan.name, _plan_id);
  END IF;

  -- Activate plan
  UPDATE profiles SET
    plan_id = _plan_id,
    plan_started_at = now(),
    plan_expires_at = CASE 
      WHEN _plan.duration_days IS NOT NULL THEN now() + (_plan.duration_days || ' days')::interval
      ELSE NULL
    END
  WHERE user_id = _user_id;

  -- Audit log
  INSERT INTO admin_action_logs (section, field_name, old_value, new_value)
  VALUES ('plans', 'plan_upgrade', COALESCE(_current_plan_id::text, 'none'), _plan.name);

  RETURN jsonb_build_object('success', true, 'plan_name', _plan.name, 'amount_charged', _plan.upgrade_price);
END;
$$;

-- Create function to expire plans
CREATE OR REPLACE FUNCTION public.expire_plans()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile RECORD;
  _free_plan_id uuid;
  _count integer := 0;
BEGIN
  SELECT id INTO _free_plan_id FROM plans WHERE is_free_plan = true LIMIT 1;
  IF _free_plan_id IS NULL THEN
    SELECT id INTO _free_plan_id FROM plans WHERE name = 'FREE' LIMIT 1;
  END IF;

  FOR _profile IN
    SELECT p.user_id, p.plan_id, pl.name as plan_name
    FROM profiles p
    JOIN plans pl ON pl.id = p.plan_id
    WHERE p.plan_expires_at IS NOT NULL 
      AND p.plan_expires_at <= now()
      AND p.plan_id != _free_plan_id
  LOOP
    UPDATE profiles SET
      plan_id = _free_plan_id,
      plan_started_at = now(),
      plan_expires_at = NULL
    WHERE user_id = _profile.user_id;

    INSERT INTO admin_action_logs (section, field_name, old_value, new_value)
    VALUES ('plans', 'plan_expired', _profile.plan_name, 'FREE');

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', _count);
END;
$$;
