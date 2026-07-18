
-- Add is_visible to homepage_faq
ALTER TABLE public.homepage_faq ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.homepage_faq ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE public.homepage_faq RENAME COLUMN sort_order TO display_order;

-- Hero content table
CREATE TABLE public.homepage_hero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL DEFAULT 'AI-Powered Crypto Arbitrage',
  subheadline text NOT NULL DEFAULT 'Automated trading powered by advanced algorithms',
  primary_cta_text text NOT NULL DEFAULT 'Start Trading',
  secondary_cta_text text NOT NULL DEFAULT 'Learn More',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_hero ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage homepage_hero" ON public.homepage_hero FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view homepage_hero" ON public.homepage_hero FOR SELECT USING (true);
INSERT INTO public.homepage_hero DEFAULT VALUES;

-- SEO meta table
CREATE TABLE public.homepage_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_title text NOT NULL DEFAULT 'ArbAI – AI-Powered Crypto Arbitrage',
  meta_description text NOT NULL DEFAULT 'Automated crypto arbitrage trading platform powered by AI.',
  og_title text NOT NULL DEFAULT 'ArbAI – AI-Powered Crypto Arbitrage',
  og_description text NOT NULL DEFAULT 'Automated crypto arbitrage trading platform powered by AI.',
  og_image text NOT NULL DEFAULT '',
  keywords text NOT NULL DEFAULT 'crypto, arbitrage, AI, trading',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage homepage_seo" ON public.homepage_seo FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view homepage_seo" ON public.homepage_seo FOR SELECT USING (true);
INSERT INTO public.homepage_seo DEFAULT VALUES;

-- Triggers
CREATE TRIGGER update_homepage_hero_updated_at BEFORE UPDATE ON public.homepage_hero FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_homepage_seo_updated_at BEFORE UPDATE ON public.homepage_seo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_homepage_faq_updated_at BEFORE UPDATE ON public.homepage_faq FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
