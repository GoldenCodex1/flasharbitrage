
-- Table to store TOTP secrets (only accessible server-side via service role)
CREATE TABLE public.totp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  encrypted_secret TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access this table
-- Users should NEVER be able to read their TOTP secret directly
-- No policies = only service_role can access
