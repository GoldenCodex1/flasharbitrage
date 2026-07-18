
-- Add multi-level referral columns to referral_config
ALTER TABLE public.referral_config
  ADD COLUMN IF NOT EXISTS level1_commission_percent numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS level3_commission_percent numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_commission_per_deposit numeric NOT NULL DEFAULT 500;

-- Rename existing column for clarity (level2 already exists as level2_commission_percent)
-- Update defaults
UPDATE public.referral_config SET
  level1_commission_percent = COALESCE(default_commission_percent, 5),
  level3_commission_percent = 1,
  max_commission_per_deposit = 500;

-- Create custom referral config for special users
CREATE TABLE IF NOT EXISTS public.custom_referral_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level1_percent numeric NOT NULL DEFAULT 5,
  level2_percent numeric NOT NULL DEFAULT 2,
  level3_percent numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_referral_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom_referral_config" ON public.custom_referral_config
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Add level column to referral_commissions for tracking
ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_user_id uuid;
