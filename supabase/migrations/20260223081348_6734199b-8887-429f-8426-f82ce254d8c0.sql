
-- Fix ALL remaining restrictive RLS policies to be permissive

-- admin_logs
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- api_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.api_settings;
CREATE POLICY "Admins can manage settings" ON public.api_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- bot_activity
DROP POLICY IF EXISTS "Users can view own bot" ON public.bot_activity;
DROP POLICY IF EXISTS "Users can insert own bot" ON public.bot_activity;
DROP POLICY IF EXISTS "Users can update own bot" ON public.bot_activity;
DROP POLICY IF EXISTS "Admins can manage bot" ON public.bot_activity;
CREATE POLICY "Users can view own bot" ON public.bot_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bot" ON public.bot_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bot" ON public.bot_activity FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage bot" ON public.bot_activity FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- deposits
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can insert own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can manage deposits" ON public.deposits;
CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage deposits" ON public.deposits FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- homepage_faq
DROP POLICY IF EXISTS "Anyone can view FAQ" ON public.homepage_faq;
DROP POLICY IF EXISTS "Admins can manage FAQ" ON public.homepage_faq;
CREATE POLICY "Anyone can view FAQ" ON public.homepage_faq FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQ" ON public.homepage_faq FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- kyc
DROP POLICY IF EXISTS "Users can view own kyc" ON public.kyc;
DROP POLICY IF EXISTS "Users can insert own kyc" ON public.kyc;
DROP POLICY IF EXISTS "Users can update own kyc" ON public.kyc;
DROP POLICY IF EXISTS "Admins can manage kyc" ON public.kyc;
CREATE POLICY "Users can view own kyc" ON public.kyc FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.kyc FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage kyc" ON public.kyc FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- platform_stats
DROP POLICY IF EXISTS "Anyone can view stats" ON public.platform_stats;
DROP POLICY IF EXISTS "Admins can manage stats" ON public.platform_stats;
CREATE POLICY "Anyone can view stats" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins can manage stats" ON public.platform_stats FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can manage referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- trade_entries
DROP POLICY IF EXISTS "Users can view own entries" ON public.trade_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.trade_entries;
DROP POLICY IF EXISTS "Admins can manage entries" ON public.trade_entries;
CREATE POLICY "Users can view own entries" ON public.trade_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.trade_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage entries" ON public.trade_entries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- trades
DROP POLICY IF EXISTS "Users can view active trades" ON public.trades;
DROP POLICY IF EXISTS "Admins can manage trades" ON public.trades;
CREATE POLICY "Users can view active trades" ON public.trades FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage trades" ON public.trades FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- wallets
DROP POLICY IF EXISTS "Users can view active wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can manage wallets" ON public.wallets;
CREATE POLICY "Users can view active wallets" ON public.wallets FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage wallets" ON public.wallets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- withdrawals
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
