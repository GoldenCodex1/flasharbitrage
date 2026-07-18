
-- Referral commissions table
CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  deposit_id uuid NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent double payment
CREATE UNIQUE INDEX idx_referral_commissions_deposit ON public.referral_commissions(deposit_id);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral_commissions"
  ON public.referral_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own referral_commissions"
  ON public.referral_commissions FOR SELECT
  USING (auth.uid() = referrer_id);
