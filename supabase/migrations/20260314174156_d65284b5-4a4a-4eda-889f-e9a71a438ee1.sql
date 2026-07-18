
-- Queue signup email from handle_new_user trigger
CREATE OR REPLACE FUNCTION public.queue_signup_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO email_queue (email_type, user_id, variables)
  VALUES ('signup', NEW.user_id, '{}'::jsonb);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_email
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION queue_signup_email();
