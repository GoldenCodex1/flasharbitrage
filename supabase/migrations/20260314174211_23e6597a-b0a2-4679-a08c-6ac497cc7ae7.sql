
-- Queue settlement email for each participant when trade is settled
CREATE OR REPLACE FUNCTION public.queue_settlement_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _entry RECORD;
BEGIN
  IF NEW.status = 'settled' AND OLD.status IS DISTINCT FROM 'settled' THEN
    FOR _entry IN
      SELECT te.user_id, te.profit, te.amount
      FROM trade_entries te
      WHERE te.trade_id = NEW.id AND te.status = 'completed'
    LOOP
      INSERT INTO email_queue (email_type, user_id, variables)
      VALUES ('settlement', _entry.user_id, jsonb_build_object(
        'trade_title', NEW.title,
        'profit', COALESCE(_entry.profit, 0)::text
      ));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_settled_email
  AFTER UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION queue_settlement_emails();
