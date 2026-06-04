CREATE OR REPLACE FUNCTION public.gen_wallet_address_for_network(_seed text, _network text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _hex text;
  _b58_chars text := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  _b32_chars text := 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  _net text := upper(coalesce(nullif(trim(_network), ''), 'GENERIC'));
  _out text := '';
  _i int;
  _len int;
  _src text;
BEGIN
  _hex := md5(_seed || gen_random_uuid()::text || clock_timestamp()::text)
       || md5(gen_random_uuid()::text || _seed || clock_timestamp()::text)
       || md5(clock_timestamp()::text || _seed || gen_random_uuid()::text);

  IF _net IN ('ERC20','BEP20','ETH','BSC','POLYGON','MATIC','ARBITRUM','ARB','BASE','OPTIMISM','OP','AVAX','AVALANCHE','FTM','FANTOM') THEN
    RETURN '0x' || substr(_hex, 1, 40);

  ELSIF _net IN ('TRC20','TRON','TRX') THEN
    _src := _b58_chars; _len := 33; _out := 'T';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('BTC','BITCOIN') THEN
    _src := _b32_chars; _len := 38; _out := 'bc1q';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('SOL','SOLANA') THEN
    _src := _b58_chars; _len := 44;
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('XRP','RIPPLE') THEN
    _src := _b58_chars; _len := 33; _out := 'r';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('TON','TONCOIN') THEN
    _src := _b58_chars; _len := 46; _out := 'EQ';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('KASPA','KAS') THEN
    _src := _b32_chars; _len := 56; _out := 'kaspa:';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('DOGE','DOGECOIN') THEN
    _src := _b58_chars; _len := 33; _out := 'D';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('LTC','LITECOIN') THEN
    _src := _b32_chars; _len := 38; _out := 'ltc1q';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSIF _net IN ('ADA','CARDANO') THEN
    _src := _b32_chars; _len := 98; _out := 'addr1';
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;

  ELSE
    -- Generic internal wallet format for unknown networks (NO ERC20 fallback)
    _src := _b58_chars; _len := 36;
    _out := lower(regexp_replace(_net, '[^A-Z0-9]', '', 'g')) || ':';
    IF length(_out) < 2 THEN _out := 'wallet:'; END IF;
    FOR _i IN 1.._len LOOP
      _out := _out || substr(_src, 1 + (('x' || substr(_hex, 1 + ((_i-1)*2) % 60, 2))::bit(8)::int) % length(_src), 1);
    END LOOP;
    RETURN _out;
  END IF;
END;
$function$;