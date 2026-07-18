
-- Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  max_trades_per_day integer NOT NULL DEFAULT 2,
  max_trade_amount numeric NOT NULL DEFAULT 50,
  max_auto_trade_slots integer NOT NULL DEFAULT 1,
  daily_withdrawal_limit numeric NOT NULL DEFAULT 100,
  monthly_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (is_active = true);

-- Admins can manage all plans
CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add plan fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN plan_started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN plan_expires_at timestamp with time zone;

-- Insert default plans
INSERT INTO public.plans (name, description, max_trades_per_day, max_trade_amount, max_auto_trade_slots, daily_withdrawal_limit, monthly_price)
VALUES 
  ('FREE', 'Basic plan with limited trading capabilities', 2, 50, 1, 100, 0),
  ('PRO', 'Professional plan with enhanced limits', 15, 1000, 5, 5000, 29.99),
  ('ELITE', 'Ultimate plan with unlimited access', 100, 10000, 999, 999999, 99.99);

-- Set all existing users to FREE plan
UPDATE public.profiles SET plan_id = (SELECT id FROM public.plans WHERE name = 'FREE' LIMIT 1)
WHERE plan_id IS NULL;

-- Update handle_new_user to assign FREE plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referral_code TEXT;
  _referred_by UUID;
  _free_plan_id UUID;
BEGIN
  _referral_code := 'ARBAI-' || upper(substr(md5(random()::text), 1, 6));
  
  SELECT id INTO _free_plan_id FROM public.plans WHERE name = 'FREE' LIMIT 1;
  
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    SELECT user_id INTO _referred_by FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
    
    IF _referred_by IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id) VALUES (_referred_by, NEW.id);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, referral_code, referred_by, plan_id, plan_started_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), _referral_code, _referred_by, _free_plan_id, now());
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.bot_activity (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;
