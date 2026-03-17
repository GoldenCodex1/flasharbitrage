-- Recreate missing triggers for email queue and deposit handling
CREATE OR REPLACE TRIGGER queue_signup_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.queue_signup_email();

CREATE OR REPLACE TRIGGER on_deposit_status_change
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_status_change();

CREATE OR REPLACE TRIGGER queue_deposit_email
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.queue_deposit_email();

CREATE OR REPLACE TRIGGER queue_withdrawal_email
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.queue_withdrawal_email();

CREATE OR REPLACE TRIGGER queue_settlement_emails
  AFTER UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.queue_settlement_emails();