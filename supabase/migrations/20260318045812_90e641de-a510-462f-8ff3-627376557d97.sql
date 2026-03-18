
-- Recreate all critical triggers

-- 1. handle_new_user on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Signup email
CREATE OR REPLACE TRIGGER trg_queue_signup_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_signup_email();

-- 3. Deposit email + status change
CREATE OR REPLACE TRIGGER trg_queue_deposit_email
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_deposit_email();

CREATE OR REPLACE TRIGGER trg_on_deposit_status_change
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.on_deposit_status_change();

-- 4. Withdrawal email
CREATE OR REPLACE TRIGGER trg_queue_withdrawal_email
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_withdrawal_email();

-- 5. Settlement email
CREATE OR REPLACE TRIGGER trg_queue_settlement_emails
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_settlement_emails();

-- Backfill profiles for existing auth users who are missing them
INSERT INTO public.profiles (user_id, full_name, referral_code, plan_id, plan_started_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'ARBAI-' || upper(substr(md5(random()::text), 1, 6)),
  (SELECT id FROM public.plans WHERE is_free_plan = true LIMIT 1),
  now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

-- Backfill user_roles for existing auth users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

-- Backfill bot_activity for existing auth users
INSERT INTO public.bot_activity (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.bot_activity b WHERE b.user_id = u.id);
