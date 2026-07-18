ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS mailgun_api_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mailgun_domain  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mailgun_region  text NOT NULL DEFAULT 'us';