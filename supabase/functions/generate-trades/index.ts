import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load generator config
    const { data: config } = await supabase
      .from("trade_generator_config")
      .select("*")
      .limit(1)
      .single();

    if (!config || !config.enabled) {
      await logEvent(supabase, "generation_skipped", "Engine disabled");
      return json({ success: true, message: "Generator disabled", generated: 0 });
    }

    // Check current active trade count
    const { count: activeCount } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const currentActive = activeCount ?? 0;

    if (currentActive >= config.max_active_trades) {
      await logEvent(supabase, "generation_skipped_due_to_limit", `Active: ${currentActive}/${config.max_active_trades}`);
      // Update engine status
      await supabase.from("system_runtime_metrics").upsert(
        { metric_name: "engine_trade_generator_status", metric_value: "limit_reached", updated_at: new Date().toISOString() },
        { onConflict: "metric_name" }
      );
      return json({ success: true, message: "Max active trades reached", active: currentActive, limit: config.max_active_trades });
    }

    // Load risk profiles
    const { data: riskProfiles } = await supabase
      .from("risk_profile_config")
      .select("profile_name, roi_min, roi_max");

    if (!riskProfiles || riskProfiles.length === 0) {
      return json({ success: false, error: "No risk profiles configured" });
    }

    // How many trades to generate (fill up to limit, max 3 per run)
    const slotsAvailable = config.max_active_trades - currentActive;
    const toGenerate = Math.min(slotsAvailable, 3);

    const pairs: string[] = config.trading_pairs ?? ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];
    const exchanges: string[] = config.exchanges ?? ["Binance", "Coinbase", "Kraken", "KuCoin", "Bybit", "OKX"];

    // Get existing active trade pairs to avoid exact duplicates
    const { data: existingTrades } = await supabase
      .from("trades")
      .select("trading_pair, buy_exchange, sell_exchange")
      .eq("status", "active");

    const existingKeys = new Set(
      (existingTrades ?? []).map((t: any) => `${t.trading_pair}|${t.buy_exchange}|${t.sell_exchange}`)
    );

    const generated: any[] = [];

    for (let i = 0; i < toGenerate; i++) {
      // Pick random risk profile
      const riskProfile = riskProfiles[Math.floor(Math.random() * riskProfiles.length)];

      // Generate realistic ROI within profile range with variation
      const roiBase = Number(riskProfile.roi_min) + Math.random() * (Number(riskProfile.roi_max) - Number(riskProfile.roi_min));
      // Add slight variation for realism
      const roiVariation = (Math.random() - 0.5) * 0.4;
      const roi = Math.max(Number(riskProfile.roi_min), Math.min(Number(riskProfile.roi_max), roiBase + roiVariation));
      const roiRounded = Math.round(roi * 100) / 100;

      // Pick random pair
      const pair = pairs[Math.floor(Math.random() * pairs.length)];

      // Pick random buy/sell exchanges (must be different)
      let buyIdx = Math.floor(Math.random() * exchanges.length);
      let sellIdx = Math.floor(Math.random() * exchanges.length);
      while (sellIdx === buyIdx && exchanges.length > 1) {
        sellIdx = Math.floor(Math.random() * exchanges.length);
      }
      const buyExchange = exchanges[buyIdx];
      const sellExchange = exchanges[sellIdx];

      // Prevent exact duplicate
      const key = `${pair}|${buyExchange}|${sellExchange}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      // Duration variation
      const minDur = config.min_duration_hours ?? 2;
      const maxDur = config.max_duration_hours ?? 6;
      const durations = [];
      for (let d = minDur; d <= maxDur; d++) durations.push(d);
      const duration = durations[Math.floor(Math.random() * durations.length)];

      // Risk level mapping
      const riskLevelMap: Record<string, string> = {
        conservative: "Low",
        balanced: "Medium",
        aggressive: "High",
      };
      const riskLevel = riskLevelMap[riskProfile.profile_name.toLowerCase()] ?? "Medium";

      // Investment amounts
      const minInvestment = config.min_investment_default ?? 25;
      const maxInvestment = config.max_investment_default ?? 10000;

      const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

      // Pick a realistic blockchain network for this trade
      const networks = ["TRC20", "ERC20", "BEP20", "BTC", "SOL"];
      const network = networks[Math.floor(Math.random() * networks.length)];

      const { data: trade, error: insertError } = await supabase.from("trades").insert({
        title: `${pair} Arbitrage`,
        trading_pair: pair,
        buy_exchange: buyExchange,
        sell_exchange: sellExchange,
        roi_percent: roiRounded,
        min_investment: minInvestment,
        max_investment: maxInvestment,
        duration_hours: duration,
        risk_level: riskLevel,
        strategy_type: "arbitrage",
        status: "active",
        slot_limit: config.slot_limit_default ?? 50,
        slots_filled: 0,
        auto_close: true,
        expires_at: expiresAt,
        settlement_mode: "auto",
        network,
      }).select("id, trading_pair, roi_percent, risk_level").single();

      if (insertError) {
        console.error("Failed to generate trade:", insertError);
        continue;
      }

      generated.push(trade);
    }

    // Log generation
    if (generated.length > 0) {
      await logEvent(supabase, "trade_generated", `Generated ${generated.length} trades`);
    }

    // Update engine status
    await supabase.from("system_runtime_metrics").upsert(
      { metric_name: "engine_trade_generator_status", metric_value: "active", updated_at: new Date().toISOString() },
      { onConflict: "metric_name" }
    );
    await supabase.from("system_runtime_metrics").upsert(
      { metric_name: "last_trade_generation", metric_value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "metric_name" }
    );

    return json({ success: true, generated: generated.length, trades: generated });
  } catch (err) {
    console.error("Trade generator error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logEvent(supabase: any, actionType: string, value: string) {
  await supabase.from("bot_logs").insert({
    action_type: actionType,
    category: "trade_generator",
    new_value: value,
  });
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
