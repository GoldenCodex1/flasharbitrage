
CREATE OR REPLACE FUNCTION public.is_auto_deposit_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM api_gateways g
    JOIN api_credentials c ON c.gateway_id = g.id
    WHERE g.active = true
      AND g.provider_name ILIKE '%nowpayment%'
      AND c.encrypted_api_key IS NOT NULL
      AND length(c.encrypted_api_key) > 5
  )
$$;
