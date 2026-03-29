
-- Replace the on_deposit_status_change function with multi-level referral support
CREATE OR REPLACE FUNCTION public.on_deposit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id uuid;
  _level2_referrer_id uuid;
  _level3_referrer_id uuid;
  _config RECORD;
  _custom RECORD;
  _l1_pct numeric;
  _l2_pct numeric;
  _l3_pct numeric;
  _max_cap numeric;
  _commission numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    -- Credit deposit to user ledger
    IF NOT EXISTS (SELECT 1 FROM transactions WHERE reference_id = NEW.id AND type = 'deposit') THEN
      INSERT INTO transactions (user_id, type, amount, description, reference_id)
      VALUES (NEW.user_id, 'deposit', NEW.amount, 'Deposit approved: ' || NEW.currency, NEW.id);
    END IF;

    -- Prevent duplicate commissions for this deposit
    IF EXISTS (SELECT 1 FROM referral_commissions WHERE deposit_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Get referral config defaults
    SELECT * INTO _config FROM referral_config LIMIT 1;
    _l1_pct := COALESCE(_config.level1_commission_percent, _config.default_commission_percent, 5);
    _l2_pct := COALESCE(_config.level2_commission_percent, 2);
    _l3_pct := COALESCE(_config.level3_commission_percent, 1);
    _max_cap := COALESCE(_config.max_commission_per_deposit, 500);

    -- Level 1: direct referrer
    SELECT referred_by INTO _referrer_id FROM profiles WHERE user_id = NEW.user_id;
    IF _referrer_id IS NOT NULL THEN
      -- Check for custom rates for this referrer
      SELECT * INTO _custom FROM custom_referral_config WHERE user_id = _referrer_id;
      
      _commission := LEAST(NEW.amount * (COALESCE(_custom.level1_percent, _l1_pct) / 100.0), _max_cap);
      IF _commission > 0 THEN
        INSERT INTO referral_commissions (referrer_id, referred_user_id, deposit_id, commission_amount, level, source_user_id)
        VALUES (_referrer_id, NEW.user_id, NEW.id, _commission, 1, NEW.user_id);
        INSERT INTO transactions (user_id, type, amount, description, reference_id)
        VALUES (_referrer_id, 'referral', _commission, 'L1 referral commission from deposit', NEW.id);
        UPDATE referrals SET total_commission = total_commission + _commission
        WHERE referrer_id = _referrer_id AND referred_id = NEW.user_id;
      END IF;

      -- Level 2: referrer's referrer
      IF COALESCE(_config.multi_level_enabled, false) THEN
        SELECT referred_by INTO _level2_referrer_id FROM profiles WHERE user_id = _referrer_id;
        IF _level2_referrer_id IS NOT NULL AND _level2_referrer_id != NEW.user_id THEN
          SELECT * INTO _custom FROM custom_referral_config WHERE user_id = _level2_referrer_id;
          _commission := LEAST(NEW.amount * (COALESCE(_custom.level2_percent, _l2_pct) / 100.0), _max_cap);
          IF _commission > 0 THEN
            INSERT INTO referral_commissions (referrer_id, referred_user_id, deposit_id, commission_amount, level, source_user_id)
            VALUES (_level2_referrer_id, NEW.user_id, NEW.id, _commission, 2, NEW.user_id);
            INSERT INTO transactions (user_id, type, amount, description, reference_id)
            VALUES (_level2_referrer_id, 'referral', _commission, 'L2 referral commission from deposit', NEW.id);
          END IF;

          -- Level 3: referrer's referrer's referrer
          SELECT referred_by INTO _level3_referrer_id FROM profiles WHERE user_id = _level2_referrer_id;
          IF _level3_referrer_id IS NOT NULL AND _level3_referrer_id != NEW.user_id AND _level3_referrer_id != _referrer_id THEN
            SELECT * INTO _custom FROM custom_referral_config WHERE user_id = _level3_referrer_id;
            _commission := LEAST(NEW.amount * (COALESCE(_custom.level3_percent, _l3_pct) / 100.0), _max_cap);
            IF _commission > 0 THEN
              INSERT INTO referral_commissions (referrer_id, referred_user_id, deposit_id, commission_amount, level, source_user_id)
              VALUES (_level3_referrer_id, NEW.user_id, NEW.id, _commission, 3, NEW.user_id);
              INSERT INTO transactions (user_id, type, amount, description, reference_id)
              VALUES (_level3_referrer_id, 'referral', _commission, 'L3 referral commission from deposit', NEW.id);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trg_deposit_status_change ON deposits;
CREATE TRIGGER trg_deposit_status_change
  AFTER UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION on_deposit_status_change();
