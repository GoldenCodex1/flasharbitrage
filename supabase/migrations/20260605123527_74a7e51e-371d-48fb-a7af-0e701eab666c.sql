ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS email_provider text NOT NULL DEFAULT 'mailgun';
-- resend_api_key already exists; ensure column present
ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS resend_api_key text;