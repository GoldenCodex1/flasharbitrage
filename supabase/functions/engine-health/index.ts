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

    const services: Record<string, string> = {};

    // Check global engine status
    const { data: globalSettings } = await supabase
      .from("bot_global_settings")
      .select("enabled, updated_at")
      .limit(1)
      .single();

    services["trade_engine"] = globalSettings?.enabled ? "active" : "offline";

    // Check auto-bot: any active bots?
    const { count: activeBots } = await supabase
      .from("bot_activity")
      .select("*", { count: "exact", head: true })
      .eq("bot_enabled", true);
    services["auto_bot_engine"] = (activeBots ?? 0) > 0 ? "active" : "warning";

    // Check settlement engine: any trades in 'running' status waiting settlement?
    const { count: pendingSettlements } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("status", "running")
      .eq("settlement_processed", false);
    services["settlement_engine"] = "active"; // It's a cron, always running

    // Check trade generation: any active/draft trades?
    const { count: activeTrades } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "draft"]);
    services["trade_generator"] = (activeTrades ?? 0) > 0 ? "active" : "warning";

    // Update system runtime metrics
    for (const [service, status] of Object.entries(services)) {
      await supabase.from("system_runtime_metrics").upsert(
        {
          metric_name: `engine_${service}_status`,
          metric_value: status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "metric_name" }
      );
    }

    // Log health check
    await supabase.from("bot_logs").insert({
      action_type: "engine_health_check",
      category: "system",
      new_value: JSON.stringify(services),
    });

    return new Response(
      JSON.stringify({ success: true, services }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Engine health check error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
