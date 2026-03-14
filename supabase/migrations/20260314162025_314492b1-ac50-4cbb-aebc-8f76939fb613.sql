-- Footer pages table
CREATE TABLE public.footer_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.footer_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage footer_pages" ON public.footer_pages FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view visible footer_pages" ON public.footer_pages FOR SELECT USING (is_visible = true);

-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team_members" ON public.team_members FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view visible team_members" ON public.team_members FOR SELECT USING (is_visible = true);

-- Site settings table for logo/favicon URLs
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view site_settings" ON public.site_settings FOR SELECT USING (true);

-- Seed default footer pages
INSERT INTO public.footer_pages (title, slug, content, display_order) VALUES
  ('About Us', 'about', '<h2>About ArbAI</h2><p>ArbAI is an AI-powered crypto arbitrage platform that leverages advanced algorithms to identify and execute profitable trading opportunities across multiple exchanges.</p>', 1),
  ('Privacy Policy', 'privacy-policy', '<h2>Privacy Policy</h2><p>Your privacy is important to us. This policy outlines how we collect, use, and protect your personal information.</p>', 2),
  ('Terms of Service', 'terms-of-service', '<h2>Terms of Service</h2><p>By using ArbAI, you agree to these terms and conditions.</p>', 3),
  ('Contact', 'contact', '<h2>Contact Us</h2><p>Email: support@arbai.com</p>', 4),
  ('Team', 'team', '<h2>Our Team</h2><p>Meet the people behind ArbAI.</p>', 5);

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('logo_url', ''),
  ('favicon_url', '');

-- Storage bucket for site media
INSERT INTO storage.buckets (id, name, public) VALUES ('site-media', 'site-media', true);

-- Storage policies
CREATE POLICY "Admins can upload site media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site media" ON storage.objects FOR UPDATE USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site media" ON storage.objects FOR DELETE USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view site media" ON storage.objects FOR SELECT USING (bucket_id = 'site-media');
