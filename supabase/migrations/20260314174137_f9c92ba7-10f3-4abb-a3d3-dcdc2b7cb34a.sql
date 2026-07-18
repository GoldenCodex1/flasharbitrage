
-- Function to invoke send-email edge function via pg_net (HTTP extension)
-- We'll use a notify approach: insert into a queue table, or call from app code.
-- Since pg_net may not be available, we'll create a helper table for pending emails
-- that the app can poll, OR we wire it from the frontend/edge functions.

-- Better approach: Create DB trigger functions that insert notifications,
-- and the app-side code will call send-email when processing these events.

-- Create an email_queue table for async processing
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  user_id uuid NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_queue" ON public.email_queue
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Trigger function: queue email on deposit approval
CREATE OR REPLACE FUNCTION public.queue_deposit_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO email_queue (email_type, user_id, variables)
    VALUES ('deposit', NEW.user_id, jsonb_build_object(
      'amount', NEW.amount::text,
      'currency', NEW.currency
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deposit_email
  AFTER UPDATE ON deposits
  FOR EACH ROW EXECUTE FUNCTION queue_deposit_email();

-- Trigger function: queue email on withdrawal approval  
CREATE OR REPLACE FUNCTION public.queue_withdrawal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO email_queue (email_type, user_id, variables)
    VALUES ('withdrawal', NEW.user_id, jsonb_build_object(
      'amount', NEW.amount::text,
      'wallet', LEFT(NEW.wallet_address, 12) || '...'
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_withdrawal_email
  AFTER UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION queue_withdrawal_email();
