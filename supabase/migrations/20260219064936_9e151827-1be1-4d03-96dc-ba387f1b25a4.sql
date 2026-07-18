
-- Platform stats for homepage (admin-editable)
CREATE TABLE public.platform_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '0',
  label text NOT NULL,
  auto_calculate boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stats" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins can manage stats" ON public.platform_stats FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default stats
INSERT INTO public.platform_stats (key, value, label) VALUES
  ('total_users', '12,847', 'Total Users'),
  ('total_profit_paid', '$2.4M', 'Total Profit Paid'),
  ('active_trades', '1,293', 'Active Trades'),
  ('success_rate', '94.7%', 'Success Rate');

-- Homepage FAQ (admin-editable)
CREATE TABLE public.homepage_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view FAQ" ON public.homepage_faq FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQ" ON public.homepage_faq FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed FAQs
INSERT INTO public.homepage_faq (question, answer, sort_order) VALUES
  ('How does ArbAI arbitrage work?', 'ArbAI uses AI-assisted algorithms to identify price discrepancies across multiple markets. Our automated execution engine places trades in milliseconds, capturing the spread as profit with minimal risk exposure.', 1),
  ('Is my capital secure?', 'Absolutely. All funds are stored in encrypted wallets with blockchain verification. Withdrawals require manual admin approval, and all accounts support 2FA authentication for maximum security.', 2),
  ('How are withdrawals processed?', 'Withdrawal requests are reviewed and processed by our admin team within 24 hours. This manual approval layer adds an extra level of security to protect your funds.', 3),
  ('Can I deactivate the auto bot?', 'Yes, you have full control. The auto bot can be toggled on or off at any time from your dashboard. You can also customize risk profiles and daily trade limits.', 4),
  ('Is referral income automatic?', 'Yes. Once someone registers using your referral code, you automatically earn commission on their trading activity. Earnings are credited to your balance in real-time.', 5);
