
-- Email settings table for admin configuration
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL DEFAULT 'ArbAI',
  sender_email text NOT NULL DEFAULT 'noreply@example.com',
  notify_signup boolean NOT NULL DEFAULT true,
  notify_deposit boolean NOT NULL DEFAULT true,
  notify_withdrawal boolean NOT NULL DEFAULT true,
  notify_settlement boolean NOT NULL DEFAULT true,
  signup_subject text NOT NULL DEFAULT 'Welcome to ArbAI!',
  signup_body text NOT NULL DEFAULT 'Hi {{name}}, welcome to ArbAI! Your account has been created successfully.',
  deposit_subject text NOT NULL DEFAULT 'Deposit Confirmed',
  deposit_body text NOT NULL DEFAULT 'Hi {{name}}, your deposit of ${{amount}} ({{currency}}) has been confirmed.',
  withdrawal_subject text NOT NULL DEFAULT 'Withdrawal Approved',
  withdrawal_body text NOT NULL DEFAULT 'Hi {{name}}, your withdrawal of ${{amount}} to {{wallet}} has been approved.',
  settlement_subject text NOT NULL DEFAULT 'Trade Settled — Profit Credited',
  settlement_body text NOT NULL DEFAULT 'Hi {{name}}, your trade "{{trade_title}}" has been settled. Profit: ${{profit}}.',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_settings" ON public.email_settings
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.email_settings (id) VALUES (gen_random_uuid());

-- Updated_at trigger
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
