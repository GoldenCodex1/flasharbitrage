-- Create credentials for existing gateways that are missing them
INSERT INTO api_credentials (gateway_id)
SELECT id FROM api_gateways WHERE id NOT IN (SELECT gateway_id FROM api_credentials);

-- Seed social media link settings
INSERT INTO site_settings (key, value) VALUES
  ('social_telegram', ''),
  ('social_twitter', ''),
  ('social_instagram', ''),
  ('social_discord', ''),
  ('social_youtube', '')
ON CONFLICT DO NOTHING;