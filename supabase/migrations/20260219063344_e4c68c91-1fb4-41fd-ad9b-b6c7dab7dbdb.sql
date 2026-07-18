
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trades (admin-created arbitrage opportunities)
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  roi_percent NUMERIC(6,2) NOT NULL,
  duration_hours NUMERIC(6,2) NOT NULL,
  min_investment NUMERIC(14,2) NOT NULL,
  max_investment NUMERIC(14,2) NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'Low',
  slot_limit INTEGER NOT NULL DEFAULT 20,
  slots_filled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Trade entries (user joins a trade)
CREATE TABLE public.trade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  profit NUMERIC(14,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.trade_entries ENABLE ROW LEVEL SECURITY;

-- Deposits
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  network TEXT,
  method TEXT NOT NULL DEFAULT 'manual',
  tx_hash TEXT UNIQUE,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  total_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Transactions (unified log)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- KYC
CREATE TABLE public.kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  document_type TEXT,
  document_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.kyc ENABLE ROW LEVEL SECURITY;

-- Wallets (admin-configured deposit wallets)
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_deposit NUMERIC(14,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Bot activity
CREATE TABLE public.bot_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bot_enabled BOOLEAN NOT NULL DEFAULT false,
  risk_profile TEXT NOT NULL DEFAULT 'moderate',
  daily_trade_limit INTEGER NOT NULL DEFAULT 15,
  compound_profits BOOLEAN NOT NULL DEFAULT false,
  trades_today INTEGER NOT NULL DEFAULT 0,
  profit_today NUMERIC(14,2) NOT NULL DEFAULT 0,
  loss_today NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_activity ENABLE ROW LEVEL SECURITY;

-- Admin logs
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- API settings
CREATE TABLE public.api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- user_roles: users can read their own, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users can CRUD own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- trades: all authenticated can read active, admins can manage
CREATE POLICY "Users can view active trades" ON public.trades FOR SELECT TO authenticated USING (status = 'active');
CREATE POLICY "Admins can manage trades" ON public.trades FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- trade_entries: users see own, admins see all
CREATE POLICY "Users can view own entries" ON public.trade_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.trade_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage entries" ON public.trade_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- deposits: users see own, admins see all
CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage deposits" ON public.deposits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- withdrawals: users see own, admins see all
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- referrals: users see where they are referrer
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can manage referrals" ON public.referrals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- transactions: users see own
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- kyc: users see own, admins manage
CREATE POLICY "Users can view own kyc" ON public.kyc FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.kyc FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage kyc" ON public.kyc FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- wallets: all authenticated can read active wallets (for deposit page)
CREATE POLICY "Users can view active wallets" ON public.wallets FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage wallets" ON public.wallets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- bot_activity: users manage own
CREATE POLICY "Users can view own bot" ON public.bot_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bot" ON public.bot_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bot" ON public.bot_activity FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage bot" ON public.bot_activity FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- admin_logs: admins only
CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- api_settings: admins only
CREATE POLICY "Admins can manage settings" ON public.api_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============

-- Auto-create profile + referral on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _referral_code TEXT;
  _referred_by UUID;
BEGIN
  -- Generate unique referral code
  _referral_code := 'ARBAI-' || upper(substr(md5(random()::text), 1, 6));
  
  -- Check if referred by someone
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    SELECT user_id INTO _referred_by FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
    
    IF _referred_by IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id) VALUES (_referred_by, NEW.id);
    END IF;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, referral_code, referred_by)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), _referral_code, _referred_by);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  -- Create bot activity record
  INSERT INTO public.bot_activity (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_trade_entries_user_id ON public.trade_entries(user_id);
CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_bot_activity_user_id ON public.bot_activity(user_id);
CREATE INDEX idx_deposits_tx_hash ON public.deposits(tx_hash);
