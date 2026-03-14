-- Homepage sections: stores title, subtitle, and items for each section
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage homepage_sections" ON public.homepage_sections FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view homepage_sections" ON public.homepage_sections FOR SELECT USING (true);

-- Seed all sections
INSERT INTO public.homepage_sections (section_key, title, subtitle, items) VALUES
(
  'how_it_works',
  'How It Works',
  'Get started in four simple steps and let AI handle the rest.',
  '[
    {"icon": "ArrowDownToLine", "title": "Deposit Funds", "desc": "Fund your account securely with crypto or manual transfer."},
    {"icon": "Bot", "title": "Activate Auto Arbitrage", "desc": "Enable the AI-powered bot to start trading for you."},
    {"icon": "TrendingUp", "title": "Earn Daily ROI", "desc": "Watch your portfolio grow with consistent daily returns."},
    {"icon": "Wallet", "title": "Withdraw Anytime", "desc": "Cash out your earnings whenever you choose."}
  ]'::jsonb
),
(
  'why_choose',
  'Why Choose ArbAI',
  'Built for serious investors who value security, automation, and transparency.',
  '[
    {"icon": "Layers", "title": "Hybrid Deposit System", "desc": "Support for both cryptocurrency deposits and manual bank transfer approvals."},
    {"icon": "Bot", "title": "Auto Bot Trading Engine", "desc": "AI-driven automated trading that works 24/7 without manual intervention."},
    {"icon": "ShieldCheck", "title": "Admin Risk Control Layer", "desc": "Multi-level admin oversight ensures platform-wide risk management."},
    {"icon": "CheckCircle", "title": "Secure Verification", "desc": "KYC verification and 2FA authentication to protect every account."},
    {"icon": "Zap", "title": "Fast Withdrawals", "desc": "Streamlined withdrawal process with admin approval within 24 hours."}
  ]'::jsonb
),
(
  'technology',
  'Arbitrage Technology',
  'Our proprietary engine combines machine learning with proven arbitrage strategies for consistent performance.',
  '[
    {"icon": "Brain", "title": "AI-Assisted Trade Matching", "desc": "Advanced algorithms identify optimal arbitrage opportunities across markets."},
    {"icon": "ShieldCheck", "title": "Risk-Controlled Strategies", "desc": "Every trade passes through multi-layer risk analysis before execution."},
    {"icon": "Cpu", "title": "Automated Execution Engine", "desc": "Millisecond trade placement ensures you capture the best spreads."},
    {"icon": "Globe", "title": "Multi-Market Monitoring", "desc": "Continuous scanning across exchanges for price discrepancies."}
  ]'::jsonb
),
(
  'referral',
  'Referral Program',
  'Invite friends and earn passive income. Our multi-tier referral system rewards you for growing the community.',
  '[
    {"icon": "Gift", "title": "Earn Commissions", "desc": "Get a percentage of every trade your referrals make."},
    {"icon": "Users", "title": "Passive Bonus Rewards", "desc": "Unlock tier bonuses as your network grows."},
    {"icon": "Copy", "title": "Easy Sharing", "desc": "Copy your unique referral link and share it anywhere."},
    {"icon": "BarChart3", "title": "Real-Time Tracking", "desc": "Monitor your referral earnings live from your dashboard."}
  ]'::jsonb
),
(
  'security',
  'Enterprise-Grade Security',
  'Your funds and data are protected by multiple layers of institutional-level security.',
  '[
    {"icon": "Link2", "title": "Blockchain Verification", "desc": "All transactions verified on-chain for full transparency."},
    {"icon": "ShieldCheck", "title": "2FA Authentication", "desc": "Two-factor security on every user account."},
    {"icon": "HandCoins", "title": "Manual Withdrawal Approval", "desc": "Admin-reviewed withdrawals prevent unauthorized access."},
    {"icon": "Lock", "title": "Encrypted Wallet Storage", "desc": "Military-grade encryption protects all stored assets."},
    {"icon": "FileSearch", "title": "Admin Audit Control", "desc": "Comprehensive logging of all platform activities."}
  ]'::jsonb
);