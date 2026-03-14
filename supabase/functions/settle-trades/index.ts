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
    // Use service role for server-side cron - no user context needed
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, unknown>[] = [];

    // Step 1: Auto-transition trades (open->closed, closed->running)
    const { data: transitionResult, error: transitionError } = await supabase.rpc(
      "auto_transition_trades"
    );
    if (transitionError) {
      console.error("Auto-transition error:", transitionError);
    } else if (transitionResult && Array.isArray(transitionResult) && transitionResult.length > 0) {
      results.push({ type: "transitions", data: transitionResult });
    }

    // Step 2: Find matured trades ready for settlement
    const { data: maturedTrades, error: fetchError } = await supabase
      .from("trades")
      .select("id, title")
      .eq("status", "running")
      .eq("settlement_processed", false)
      .not("settlement_date", "is", null)
      .lte("settlement_date", new Date().toISOString());

    if (fetchError) {
      console.error("Fetch matured trades error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!maturedTrades || maturedTrades.length === 0) {
      // Also check trades without settlement_date but with expires_at passed
      const { data: expiredTrades } = await supabase
        .from("trades")
        .select("id, title")
        .eq("status", "running")
        .eq("settlement_processed", false)
        .not("expires_at", "is", null)
        .lte("expires_at", new Date().toISOString());

      const allTrades = [...(maturedTrades ?? []), ...(expiredTrades ?? [])];
      // Deduplicate
      const seen = new Set<string>();
      const uniqueTrades = allTrades.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      if (uniqueTrades.length === 0) {
    // Update last cron run metric even when no trades
      await supabase
        .from("system_runtime_metrics")
        .upsert({ metric_name: "last_cron_run", metric_value: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "metric_name" });

      return new Response(
        JSON.stringify({ success: true, message: "No matured trades", transitions: transitionResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      }

      // Process each trade
      for (const trade of uniqueTrades) {
        console.log(`Settling trade: ${trade.id} (${trade.title})`);
        const { data: settleResult, error: settleError } = await supabase.rpc(
          "settle_trade",
          { _trade_id: trade.id }
        );

        if (settleError) {
          console.error(`Settlement error for ${trade.id}:`, settleError);
          results.push({ trade_id: trade.id, success: false, error: settleError.message });
        } else {
          console.log(`Settlement result for ${trade.id}:`, settleResult);
          results.push({ trade_id: trade.id, ...(settleResult as object) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, settlements: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process matured trades
    for (const trade of maturedTrades) {
      console.log(`Settling trade: ${trade.id} (${trade.title})`);
      const { data: settleResult, error: settleError } = await supabase.rpc(
        "settle_trade",
        { _trade_id: trade.id }
      );

      if (settleError) {
        console.error(`Settlement error for ${trade.id}:`, settleError);
        results.push({ trade_id: trade.id, success: false, error: settleError.message });
      } else {
        console.log(`Settlement result for ${trade.id}:`, settleResult);
        results.push({ trade_id: trade.id, ...(settleResult as object) });
      }
    }

    // Update last cron run metric
    await supabase
      .from("system_runtime_metrics")
      .update({ metric_value: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("metric_name", "last_cron_run");

    return new Response(
      JSON.stringify({ success: true, settlements: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Settlement engine error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
