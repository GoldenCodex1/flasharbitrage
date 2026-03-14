INSERT INTO system_runtime_metrics (metric_name, metric_value) 
VALUES ('last_cron_run', now()::text)
ON CONFLICT (metric_name) DO UPDATE SET metric_value = now()::text, updated_at = now();