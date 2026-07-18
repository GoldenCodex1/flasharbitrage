
-- system_runtime_metrics table
CREATE TABLE public.system_runtime_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL UNIQUE,
  metric_value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_runtime_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_runtime_metrics"
  ON public.system_runtime_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial metric
INSERT INTO public.system_runtime_metrics (metric_name, metric_value)
VALUES ('last_cron_run', now()::text);
