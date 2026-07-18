
-- Create risk_scores table for user risk scoring
CREATE TABLE public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  risk_flags jsonb DEFAULT '[]'::jsonb,
  last_calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage risk_scores" ON public.risk_scores
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view own risk score
CREATE POLICY "Users can view own risk_score" ON public.risk_scores
  FOR SELECT USING (auth.uid() = user_id);
