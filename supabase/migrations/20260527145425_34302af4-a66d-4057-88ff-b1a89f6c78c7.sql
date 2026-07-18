-- Backfill wallet flow addresses on existing trade_entries to match their trade's network
UPDATE public.trade_entries te
SET 
  from_address = public.gen_wallet_address_for_network(te.user_id::text || '-from-' || te.trade_id::text, COALESCE(t.network, 'ERC20')),
  mid_address = public.gen_wallet_address_for_network(te.trade_id::text || '-mid-' || te.id::text, COALESCE(t.network, 'ERC20')),
  intermediate_address = public.gen_wallet_address_for_network(te.trade_id::text || '-int-' || te.id::text, COALESCE(t.network, 'ERC20')),
  final_address = public.gen_wallet_address_for_network(te.user_id::text || '-final-' || te.trade_id::text, COALESCE(t.network, 'ERC20'))
FROM public.trades t
WHERE te.trade_id = t.id
  AND (
    te.from_address LIKE '0x%' OR te.from_address IS NULL
    OR te.mid_address LIKE '0x%' OR te.mid_address IS NULL
    OR te.intermediate_address LIKE '0x%' OR te.intermediate_address IS NULL
    OR te.final_address LIKE '0x%' OR te.final_address IS NULL
  )
  AND COALESCE(t.network, 'ERC20') NOT IN ('ERC20','BEP20','ETH','BSC');